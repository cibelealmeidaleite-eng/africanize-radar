import { XMLParser } from 'fast-xml-parser';
import type { PersonRow, RawArticle } from './types';

/**
 * Collection layer is intentionally decoupled from the AI curation layer.
 * Each "source" implements fetchForPerson() and returns raw articles.
 * Add new sources here (a specialized outlet's RSS, a paid news API, etc.)
 * without touching curateNews.ts or the pipeline.
 */
interface NewsSource {
  name: string;
  fetchForPerson(person: PersonRow): Promise<RawArticle[]>;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function stripHtml(input: string | undefined): string {
  if (!input) return '';
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extracts "Source Name" from Google News' "Title - Source" convention. */
function splitTitleAndSource(rawTitle: string): { title: string; source: string } {
  const idx = rawTitle.lastIndexOf(' - ');
  if (idx === -1) return { title: rawTitle, source: 'Google News' };
  return { title: rawTitle.slice(0, idx).trim(), source: rawTitle.slice(idx + 3).trim() };
}

const MAX_ARTICLES_PER_PERSON = 5;
const LOOKBACK_HOURS = 48;

/**
 * Google News RSS search — free, no API key required, decent coverage for
 * Brazilian + international outlets. This is the default/primary source for
 * the MVP; swap or add sources in the `sources` array below.
 */
const googleNewsRss: NewsSource = {
  name: 'Google News RSS',
  async fetchForPerson(person: PersonRow): Promise<RawArticle[]> {
    const query = encodeURIComponent(`"${person.name}"`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': 'AfricanizeRadar/1.0 (+internal editorial monitoring tool)' },
        signal: controller.signal,
      });
    } catch (e) {
      console.warn(`[collectNews] Timeout/erro de rede para "${person.name}"`, e);
      return [];
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[collectNews] Google News RSS falhou para "${person.name}": HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    let parsed: any;
    try {
      parsed = xmlParser.parse(xml);
    } catch (e) {
      console.warn(`[collectNews] XML inválido para "${person.name}"`, e);
      return [];
    }

    const items = parsed?.rss?.channel?.item;
    const list = Array.isArray(items) ? items : items ? [items] : [];

    const cutoff = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;

    const articles: RawArticle[] = [];
    for (const item of list.slice(0, MAX_ARTICLES_PER_PERSON * 2)) {
      const rawTitle: string = item.title ?? '';
      const link: string = item.link ?? '';
      const pubDateStr: string = item.pubDate ?? '';
      const pubDate = pubDateStr ? new Date(pubDateStr) : null;

      if (pubDate && pubDate.getTime() < cutoff) continue;
      if (!rawTitle || !link) continue;

      const { title, source } = splitTitleAndSource(rawTitle);
      const description = stripHtml(item.description);

      articles.push({
        personId: person.id,
        personName: person.name,
        title,
        summary: description || title,
        sourceName: source,
        sourceUrl: link,
        publishedAt: pubDate ? pubDate.toISOString() : null,
      });

      if (articles.length >= MAX_ARTICLES_PER_PERSON) break;
    }

    return articles;
  },
};

// Registry of active sources. Add more here (RSS feeds of specific outlets,
// official press APIs, etc.) — each is called independently and results are
// merged before deduplication.
const sources: NewsSource[] = [googleNewsRss];

export async function collectNews(people: PersonRow[]): Promise<RawArticle[]> {
  const all: RawArticle[] = [];

  // Sequential-ish batches to be polite with the free RSS endpoint and avoid
  // hitting rate limits when the people list grows.
  const BATCH_SIZE = 10;
  for (let i = 0; i < people.length; i += BATCH_SIZE) {
    const batch = people.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (person) => {
        const perSource = await Promise.all(
          sources.map((source) =>
            source.fetchForPerson(person).catch((e) => {
              console.warn(`[collectNews] fonte "${source.name}" falhou para "${person.name}"`, e);
              return [] as RawArticle[];
            })
          )
        );
        return perSource.flat();
      })
    );
    all.push(...results.flat());
  }

  return all;
}
