import type { Handler } from '@netlify/functions';
import { runRadarPipeline } from './lib/pipeline';

/**
 * HTTP-triggered version of the exact same pipeline used by the 09:00
 * scheduled function. Used by the "▶ Executar radar agora" button in the UI.
 *
 * IMPORTANT: Netlify's free plan caps a normal function invocation at a few
 * seconds (Background Functions, which allow up to 15 minutes, require a
 * paid plan). So this stays synchronous, and pipeline.ts is tuned to only
 * process a small batch of people per call — enough to reliably finish in
 * time, rotating through everyone across multiple runs instead of trying to
 * do it all at once.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido, use POST.' }) };
  }

  try {
    const result = await runRadarPipeline();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        runId: result.runId,
        peopleChecked: result.peopleChecked,
        peopleTotal: result.peopleTotal,
        newsFound: result.newsFound,
        hotCount: result.hotCount,
        watchCount: result.watchCount,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err?.message ?? 'Erro desconhecido ao executar o radar.' }),
    };
  }
};
