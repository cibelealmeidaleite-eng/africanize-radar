/**
 * Parser de arquivos .ics focado em UMA tarefa: encontrar candidatos a nomes
 * de pessoas dentro dos eventos do calendário de produção da Africanize.
 *
 * O calendário NÃO é usado como calendário editorial dentro do app — ele serve
 * apenas como fonte de importação inicial (e, opcionalmente, reimportações
 * futuras) para popular a tabela `people`.
 */

export interface IcsCandidate {
  name: string;
  occurrences: number;
  matchType: 'aniversario' | 'falecimento' | 'estrela' | 'outro';
  sampleSummary: string;
  selected: boolean;
}

interface RawEvent {
  summary: string;
}

// Unescape RFC5545 text (\, \; \\ \n)
function unescapeIcsText(text: string): string {
  return text
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

/** Unfold folded lines (continuation lines start with a space or tab) and extract SUMMARY values. */
function extractSummaries(icsText: string): RawEvent[] {
  const normalized = icsText.replace(/\r\n/g, '\n');
  const rawLines = normalized.split('\n');

  const unfolded: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  const events: RawEvent[] = [];
  for (const line of unfolded) {
    if (line.startsWith('SUMMARY:') || line.startsWith('SUMMARY;')) {
      const colonIdx = line.indexOf(':');
      const value = unescapeIcsText(line.slice(colonIdx + 1));
      if (value) events.push({ summary: value });
    }
  }
  return events;
}

// Bracket-style markers used across the Africanize calendar, tolerating the
// accented/unaccented and singular/plural variants that show up in practice.
const BRACKET_RE = /^\[(aniversário|aniversários|aniversario|aniversarios|falecimento|morte)\]\s*(.+)$/i;
const FALECIMENTO_ARROW_RE = /^(.+?)\s*›\s*Data de falecimento$/;
const MORREU_RE = /^(?:Morreu|Morre)\s+(?:o\s+ex-\S+\s+)?(.+)$/i;
const ESTRELA_RE = /^(.+?)\s+recebe sua estrela/i;

// Phrases that reliably indicate the summary is NOT a person (a commemorative
// date, an internal team event, a content-format tag, a sports fixture, etc).
// Used only for the secondary "possible names not tagged" pass.
const NON_PERSON_HINTS = [
  'copa 2026',
  'copa do mundo',
  'copa africana',
  'dia internacional',
  'dia nacional',
  'dia mundial',
  'dia da ',
  'dia de ',
  'dia do ',
  'dia dos ',
  'fórmula 1',
  'formula 1',
  'festival',
  'independência',
  'independencia',
  'jogos olímpicos',
  'jogos olimpicos',
  'conteúdo',
  'conteúdos',
  'conteudo',
  'conteudos',
  'reunião',
  'reuniao',
  'colunista',
  'ausente',
  'ausência',
  'ausencia',
  'folga',
  'feriado',
  '[live]',
  '[evento]',
  '[eventos]',
  'subir publi',
  'vencimento',
  'verificar',
  'consulta',
  'watch party',
  'premiação',
  'premiacao',
  'awards',
  'grammy',
  'oscar',
  'emmy',
  'globo de ouro',
  'met gala',
  'vmas',
  'bet awards',
  'bet hip hop',
  'naacp',
  'critics choice',
  'tony awards',
  'temporada',
  'estreia',
  'premiere',
  'coletiva de imprensa',
  'cabine de imprensa',
  'agenda de imprensa',
  'início',
  'inicia',
  'nasce ',
  'aniversário de casamento',
];

function looksLikePersonName(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  const low = trimmed.toLowerCase();
  if (NON_PERSON_HINTS.some((hint) => low.includes(hint))) return false;
  // Heuristic: at least two "words" and starts with a capital letter,
  // predominantly letters (allows accents, apostrophes, hyphens, dots).
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  const namePattern = /^[A-ZÀ-Ý][a-zà-ÿ'.-]*$/;
  const capitalizedWords = words.filter((w) => namePattern.test(w));
  return capitalizedWords.length >= 2;
}

export interface ParseResult {
  strongCandidates: IcsCandidate[];
  possibleCandidates: IcsCandidate[];
  totalEvents: number;
}

export function parseIcsForPeople(icsText: string): ParseResult {
  const events = extractSummaries(icsText);

  const strong = new Map<string, IcsCandidate>();
  const possible = new Map<string, IcsCandidate>();

  const addTo = (
    map: Map<string, IcsCandidate>,
    name: string,
    matchType: IcsCandidate['matchType'],
    sample: string
  ) => {
    const key = name.trim();
    if (!key) return;
    const existing = map.get(key.toLowerCase());
    if (existing) {
      existing.occurrences += 1;
    } else {
      map.set(key.toLowerCase(), {
        name: key,
        occurrences: 1,
        matchType,
        sampleSummary: sample,
        selected: true,
      });
    }
  };

  for (const { summary } of events) {
    let m = BRACKET_RE.exec(summary);
    if (m) {
      addTo(strong, m[2], 'aniversario', summary);
      continue;
    }
    m = FALECIMENTO_ARROW_RE.exec(summary);
    if (m) {
      addTo(strong, m[1], 'falecimento', summary);
      continue;
    }
    m = MORREU_RE.exec(summary);
    if (m) {
      addTo(strong, m[1], 'falecimento', summary);
      continue;
    }
    m = ESTRELA_RE.exec(summary);
    if (m) {
      addTo(strong, m[1], 'estrela', summary);
      continue;
    }
    // Secondary pass: bare summaries that look like a "Firstname Lastname"
    // and don't match any known non-person phrase.
    if (looksLikePersonName(summary)) {
      addTo(possible, summary, 'outro', summary);
    }
  }

  const sortByOccurrences = (a: IcsCandidate, b: IcsCandidate) =>
    b.occurrences - a.occurrences || a.name.localeCompare(b.name);

  return {
    strongCandidates: Array.from(strong.values()).sort(sortByOccurrences),
    possibleCandidates: Array.from(possible.values()).sort(sortByOccurrences),
    totalEvents: events.length,
  };
}
