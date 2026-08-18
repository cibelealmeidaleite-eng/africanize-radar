import type { Config } from '@netlify/functions';
import { runRadarPipeline } from './lib/pipeline';

// Netlify Scheduled Functions always use cron in UTC. Brazil abolished DST in
// 2019, so America/Sao_Paulo is a fixed UTC-3 year-round: 09:00 BRT = 12:00 UTC.
export default async () => {
  try {
    const result = await runRadarPipeline();
    console.log('[daily-radar] Execução concluída', result);
  } catch (err) {
    // The pipeline already records the error in radar_runs; we still log it
    // here so it shows up in Netlify's function logs too.
    console.error('[daily-radar] Execução falhou', err);
  }
};

export const config: Config = {
  schedule: '0 12 * * *',
};
