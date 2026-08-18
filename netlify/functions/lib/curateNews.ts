import { SYSTEM_PROMPT, buildUserPrompt, type PromptArticle } from './prompt';
import type { CuratedItem } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5';
const BATCH_SIZE = 12; // articles per API call, keeps prompts small & responses reliable

function extractJson(text: string): string {
  let cleaned = text.trim();
  // Strip markdown code fences if the model added them despite instructions.
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  // If there's leading/trailing prose, grab the outermost { ... } block.
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }
  return cleaned;
}

async function callAnthropic(system: string, user: string, apiKey: string, model: string): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Anthropic API retornou HTTP ${res.status}: ${errText}`);
  }

  const data: any = await res.json();
  const textBlock = (data.content ?? []).find((b: any) => b.type === 'text');
  if (!textBlock) throw new Error('Resposta da Anthropic API não contém bloco de texto.');
  return textBlock.text as string;
}

async function curateBatch(
  articles: PromptArticle[],
  apiKey: string,
  model: string
): Promise<CuratedItem[]> {
  const userPrompt = buildUserPrompt(articles);

  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt =
      attempt === 1
        ? userPrompt
        : `${userPrompt}\n\nATENÇÃO: sua resposta anterior não era um JSON válido. Responda APENAS com o objeto JSON, sem nenhum texto adicional, sem markdown, sem comentários.`;

    try {
      const raw = await callAnthropic(SYSTEM_PROMPT, prompt, apiKey, model);
      const jsonText = extractJson(raw);
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed.items)) throw new Error('Campo "items" ausente ou inválido.');
      return parsed.items as CuratedItem[];
    } catch (e) {
      if (attempt === 2) {
        console.error('[curateNews] Falha ao obter JSON válido da IA após retry.', e);
        return [];
      }
      // fall through to retry
    }
  }
  return [];
}

export async function curateNews(articles: PromptArticle[]): Promise<CuratedItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada nas variáveis de ambiente.');
  }
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const results: CuratedItem[] = [];
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const curated = await curateBatch(batch, apiKey, model);
    results.push(...curated);
  }
  return results;
}

/** Picks the 3 highest-potential items for the "3 principais pautas de hoje" summary. */
export function pickTopThree(items: CuratedItem[]): CuratedItem[] {
  return [...items]
    .filter((i) => i.classification !== 'DISCARD')
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
