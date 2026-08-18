import type { RawArticle } from './types';

const STOPWORDS = new Set([
  'a', 'o', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com',
  'um', 'uma', 'no', 'na', 'nos', 'nas', 'que', 'por', 'se', 'sua', 'seu', 'à', 'ao',
]);

function normalize(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.5;

export interface GroupedArticle extends RawArticle {
  sources: { name: string; url: string }[];
}

/**
 * Groups same-event articles collected in this run: same person + similar
 * title (e.g. Billboard, Variety and Reuters covering the same announcement)
 * become ONE grouped article carrying multiple sources, instead of several
 * near-identical news items.
 */
export function groupSameEventArticles(articles: RawArticle[]): GroupedArticle[] {
  const groups: GroupedArticle[] = [];

  for (const article of articles) {
    const tokens = normalize(article.title);
    const existing = groups.find(
      (g) =>
        g.personId === article.personId &&
        jaccardSimilarity(normalize(g.title), tokens) >= SIMILARITY_THRESHOLD
    );

    if (existing) {
      if (!existing.sources.some((s) => s.url === article.sourceUrl)) {
        existing.sources.push({ name: article.sourceName, url: article.sourceUrl });
      }
      // Prefer the earliest published date for the grouped item.
      if (
        article.publishedAt &&
        (!existing.publishedAt || new Date(article.publishedAt) < new Date(existing.publishedAt))
      ) {
        existing.publishedAt = article.publishedAt;
      }
    } else {
      groups.push({
        ...article,
        sources: [{ name: article.sourceName, url: article.sourceUrl }],
      });
    }
  }

  return groups;
}

/**
 * Checks a candidate title/person against a list of recent existing titles
 * (already in the DB, e.g. last 5 days for that person) to avoid recreating
 * a pauta that already surfaced in a previous run.
 */
export function isAlreadyKnown(candidateTitle: string, existingTitles: string[]): boolean {
  const candidateTokens = normalize(candidateTitle);
  return existingTitles.some(
    (t) => jaccardSimilarity(normalize(t), candidateTokens) >= SIMILARITY_THRESHOLD
  );
}
