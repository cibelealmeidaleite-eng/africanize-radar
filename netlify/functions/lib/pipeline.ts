import { getSupabaseAdmin } from './supabaseAdmin';
import { collectNews } from './collectNews';
import { groupSameEventArticles, isAlreadyKnown, type GroupedArticle } from './dedupe';
import { curateNews } from './curateNews';
import type { PersonRow, CuratedItem } from './types';

export interface PipelineResult {
  runId: string;
  peopleChecked: number;
  peopleTotal: number;
  newsFound: number;
  hotCount: number;
  watchCount: number;
}

const LOOKBACK_DAYS_FOR_DEDUPE = 5;

// Netlify's free plan hard-kills a normal function invocation after ~30s
// (Background Functions, which allow up to 15 minutes, need a paid plan —
// not assumed here). So this pipeline stays deliberately small per call:
// few people, at most one AI batch call, short network timeouts. Coverage
// of everyone happens by ROTATING across many runs (the daily 09h run +
// however many times someone clicks "Executar radar agora"), not by trying
// to do everything in one shot.
const MAX_PEOPLE_PER_RUN = 15;
// Even if those 15 people generate lots of articles, only send the first
// batch to the AI — this guarantees a single Anthropic API call (plus at
// most one retry) instead of several sequential ones, which was the main
// risk of blowing the time budget. Anything left over simply isn't saved
// this run, so it's picked up again automatically next time (nothing is
// lost — dedup only skips things already stored in news_items).
const MAX_ARTICLES_TO_CURATE_PER_RUN = 12;

const PRIORITY_WEIGHT: Record<string, number> = { Alta: 0, Média: 1, Baixa: 2 };

function selectPeopleForThisRun(people: PersonRow[]): PersonRow[] {
  const sorted = [...people].sort((a: any, b: any) => {
    const pa = PRIORITY_WEIGHT[a.priority] ?? 1;
    const pb = PRIORITY_WEIGHT[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    const la = a.last_checked_at ? new Date(a.last_checked_at).getTime() : 0;
    const lb = b.last_checked_at ? new Date(b.last_checked_at).getTime() : 0;
    return la - lb; // never-checked / longest-ago-checked first
  });
  return sorted.slice(0, MAX_PEOPLE_PER_RUN);
}

export async function runRadarPipeline(): Promise<PipelineResult> {
  const supabase = getSupabaseAdmin();
  const startedAt = new Date().toISOString();

  const { data: runRow, error: runInsertError } = await supabase
    .from('radar_runs')
    .insert({ started_at: startedAt, status: 'running', people_checked: 0, news_found: 0, hot_count: 0, watch_count: 0 })
    .select()
    .single();

  if (runInsertError || !runRow) {
    throw new Error(`Não foi possível registrar a execução do radar: ${runInsertError?.message}`);
  }

  const runId = runRow.id as string;

  try {
    // 1. Active people
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select('id, name, aliases, category, country, priority, topics, active, last_news_at, last_checked_at')
      .eq('active', true);
    if (peopleError) throw new Error(`Erro ao buscar pessoas ativas: ${peopleError.message}`);
    const allActivePeople = (peopleData ?? []) as PersonRow[];

    if (allActivePeople.length === 0) {
      await finalizeRun(supabase, runId, {
        status: 'success',
        people_checked: 0,
        news_found: 0,
        hot_count: 0,
        watch_count: 0,
      });
      return { runId, peopleChecked: 0, peopleTotal: 0, newsFound: 0, hotCount: 0, watchCount: 0 };
    }

    // Cap per run to stay under Netlify's function time limit; rotates
    // coverage across runs by priority + longest-since-checked.
    const people = selectPeopleForThisRun(allActivePeople);

    // 2. Collect raw articles (decoupled collection layer)
    const rawArticles = await collectNews(people);

    // 3. Group same-event articles collected in this run (multi-source dedupe)
    const grouped = groupSameEventArticles(rawArticles);

    // 4. Drop groups that match something already stored recently for that person
    const cutoffIso = new Date(Date.now() - LOOKBACK_DAYS_FOR_DEDUPE * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentNews } = await supabase
      .from('news_items')
      .select('person_id, title')
      .gte('found_at', cutoffIso);

    const recentTitlesByPerson = new Map<string, string[]>();
    for (const row of recentNews ?? []) {
      const list = recentTitlesByPerson.get(row.person_id) ?? [];
      list.push(row.title);
      recentTitlesByPerson.set(row.person_id, list);
    }

    const freshGroups: GroupedArticle[] = [];
    for (const g of grouped) {
      const knownTitles = recentTitlesByPerson.get(g.personId) ?? [];
      if (isAlreadyKnown(g.title, knownTitles)) continue;
      freshGroups.push(g);
    }

    // Cap how much we send to the AI this run (see constant comment above) —
    // whatever doesn't fit just waits for the next run, nothing is lost.
    const groupsToCurate = freshGroups.slice(0, MAX_ARTICLES_TO_CURATE_PER_RUN);

    if (groupsToCurate.length === 0) {
      await touchLastChecked(supabase, people);
      await finalizeRun(supabase, runId, {
        status: 'success',
        people_checked: people.length,
        news_found: 0,
        hot_count: 0,
        watch_count: 0,
      });
      return {
        runId,
        peopleChecked: people.length,
        peopleTotal: allActivePeople.length,
        newsFound: 0,
        hotCount: 0,
        watchCount: 0,
      };
    }

    // 5. AI curation (editorial layer, fully decoupled from collection)
    const curated = await curateNews(
      groupsToCurate.map((g) => ({
        personName: g.personName,
        title: g.title,
        summary: g.summary,
        sourceNames: g.sources.map((s) => s.name),
        publishedAt: g.publishedAt,
      }))
    );

    // 6. Persist news_items (index-aligned with groupsToCurate; if the AI
    // dropped items due to a parsing failure, we simply persist fewer than collected).
    const now = new Date().toISOString();
    const personById = new Map(people.map((p) => [p.id, p]));

    // Pre-filter using the AI's is_about_person flag so clearly off-topic
    // mentions (person merely cited in someone else's story) never hit the DB.
    const finalRows = groupsToCurate
      .map((g, idx) => ({ g, c: curated[idx] }))
      .filter(({ c }) => c && c.is_about_person !== false)
      .map(({ g, c }) => {
        const person = personById.get(g.personId);
        const classification = c!.classification ?? 'DISCARD';
        const status = classification === 'DISCARD' ? 'Descartada' : 'Nova';
        return {
          person_id: g.personId,
          title: c!.title || g.title,
          summary: c!.summary || g.summary,
          source_name: g.sources[0]?.name ?? 'Fonte desconhecida',
          source_url: g.sourceUrl,
          sources: g.sources.length > 1 ? g.sources.slice(1) : null,
          published_at: g.publishedAt,
          found_at: now,
          category: person?.category ?? 'Outro',
          relevance_score: typeof c!.score === 'number' ? Math.max(0, Math.min(10, c!.score)) : 0,
          classification,
          status,
          why_it_matters: c!.why_it_matters ?? '',
          recommended_format: c!.recommended_format ?? [],
          is_duplicate: Boolean(c!.is_duplicate),
          duplicate_of: null,
          is_alert: Boolean(c!.is_alert),
          alert_reason: c!.alert_reason ?? null,
        };
      });

    if (finalRows.length > 0) {
      const { error: insertError } = await supabase.from('news_items').insert(finalRows);
      if (insertError) throw new Error(`Erro ao salvar notícias: ${insertError.message}`);
    }

    // 7. Touch last_news_at for people with at least one non-duplicate, non-discard item
    const peopleWithNews = new Set(
      finalRows.filter((r) => !r.is_duplicate && r.classification !== 'DISCARD').map((r) => r.person_id)
    );
    if (peopleWithNews.size > 0) {
      await Promise.all(
        Array.from(peopleWithNews).map((personId) =>
          supabase.from('people').update({ last_news_at: now }).eq('id', personId)
        )
      );
    }
    // Mark ALL people processed this run as checked (regardless of whether
    // news was found), so the next run's rotation moves on to others instead
    // of re-picking the same top-priority names forever.
    await touchLastChecked(supabase, people);

    const hotCount = finalRows.filter((r) => r.classification === 'HOT').length;
    const watchCount = finalRows.filter((r) => r.classification === 'WATCH').length;

    await finalizeRun(supabase, runId, {
      status: 'success',
      people_checked: people.length,
      news_found: finalRows.length,
      hot_count: hotCount,
      watch_count: watchCount,
    });

    return {
      runId,
      peopleChecked: people.length,
      peopleTotal: allActivePeople.length,
      newsFound: finalRows.length,
      hotCount,
      watchCount,
    };
  } catch (err: any) {
    await finalizeRun(supabase, runId, {
      status: 'error',
      error_message: err?.message ?? String(err),
    });
    throw err;
  }
}

async function finalizeRun(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  runId: string,
  patch: Record<string, unknown>
) {
  await supabase
    .from('radar_runs')
    .update({ ...patch, finished_at: new Date().toISOString() })
    .eq('id', runId);
}

async function touchLastChecked(supabase: ReturnType<typeof getSupabaseAdmin>, people: PersonRow[]) {
  if (people.length === 0) return;
  const now = new Date().toISOString();
  const ids = people.map((p) => p.id);
  await supabase.from('people').update({ last_checked_at: now }).in('id', ids);
}
