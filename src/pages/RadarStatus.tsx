import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { usePeople } from '../hooks/usePeople';
import RunRadarButton from '../components/RunRadarButton';
import type { RadarRun } from '../lib/types';

function nextRunAt(): string {
  // The scheduled function runs daily at 09:00 America/Sao_Paulo (fixed UTC-3,
  // Brazil no longer observes DST), i.e. 12:00 UTC.
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export default function RadarStatus() {
  const [runs, setRuns] = useState<RadarRun[]>([]);
  const { people } = usePeople();

  async function loadRuns() {
    const { data } = await supabase
      .from('radar_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(15);
    setRuns((data ?? []) as RadarRun[]);
  }

  useEffect(() => {
    loadRuns();
  }, []);

  const lastRun = runs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Status do radar</h1>
          <p className="mt-1 text-sm text-ink-500">
            Execução automática diária às 09:00 (horário de Brasília)
          </p>
        </div>
        <RunRadarButton onFinished={loadRuns} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Última execução</p>
          <p className="mt-1 font-display text-sm font-semibold text-ink-900">
            {lastRun
              ? new Date(lastRun.started_at).toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })
              : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Próxima execução</p>
          <p className="mt-1 font-display text-sm font-semibold text-ink-900">{nextRunAt()}</p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Status</p>
          <p
            className={`mt-1 font-display text-sm font-semibold ${
              lastRun?.status === 'error'
                ? 'text-ember-600'
                : lastRun?.status === 'success'
                  ? 'text-green-600'
                  : 'text-ink-900'
            }`}
          >
            {lastRun?.status ?? 'sem execuções'}
          </p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Pessoas monitoradas</p>
          <p className="mt-1 font-display text-sm font-semibold text-ink-900">
            {people.filter((p) => p.active).length} ativas / {people.length} total
          </p>
        </div>
      </div>

      {lastRun?.status === 'error' && lastRun.error_message && (
        <div className="rounded-xl border border-ember-500/30 bg-ember-500/5 p-4 text-sm text-ember-700">
          <p className="font-semibold">Erro na última execução:</p>
          <p className="mt-1 font-mono text-xs">{lastRun.error_message}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3">Início</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pessoas checadas</th>
              <th className="px-4 py-3">Notícias encontradas</th>
              <th className="px-4 py-3">Quentes</th>
              <th className="px-4 py-3">Acompanhar</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-400">
                  Nenhuma execução registrada. Clique em "Executar radar agora" para testar.
                </td>
              </tr>
            )}
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-ink-100 last:border-0">
                <td className="px-4 py-3 text-ink-700">
                  {new Date(run.started_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      run.status === 'success'
                        ? 'bg-green-500/10 text-green-700'
                        : run.status === 'error'
                          ? 'bg-ember-500/10 text-ember-600'
                          : 'bg-ink-100 text-ink-500'
                    }`}
                  >
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-600">{run.people_checked}</td>
                <td className="px-4 py-3 text-ink-600">{run.news_found}</td>
                <td className="px-4 py-3 text-ink-600">{run.hot_count}</td>
                <td className="px-4 py-3 text-ink-600">{run.watch_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
