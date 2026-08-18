import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNews } from '../hooks/useNews';
import NewsCard from '../components/NewsCard';
import type { RadarRun } from '../lib/types';

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function History() {
  const [runs, setRuns] = useState<RadarRun[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('radar_runs')
      .select('*')
      .eq('status', 'success')
      .order('started_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const list = (data ?? []) as RadarRun[];
        setRuns(list);
        if (list.length > 0) setSelectedDate(dateKey(list[0].started_at));
      });
  }, []);

  const from = selectedDate ? `${selectedDate}T00:00:00.000Z` : undefined;
  const to = selectedDate ? `${selectedDate}T23:59:59.999Z` : undefined;

  const { items, loading } = useNews({ dateFrom: from, dateTo: to, classification: 'all' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Histórico</h1>
        <p className="mt-1 text-sm text-ink-500">Curadorias anteriores do Africanize Radar</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {runs.length === 0 && (
          <p className="text-sm text-ink-400">Nenhuma execução registrada ainda.</p>
        )}
        {runs.map((run) => {
          const key = dateKey(run.started_at);
          return (
            <button
              key={run.id}
              onClick={() => setSelectedDate(key)}
              className={`shrink-0 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                selectedDate === key
                  ? 'border-ink-950 bg-ink-950 text-white'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
              }`}
            >
              <p className="font-semibold">
                {new Date(run.started_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </p>
              <p className={`text-xs ${selectedDate === key ? 'text-ink-300' : 'text-ink-400'}`}>
                {run.hot_count} quentes &middot; {run.watch_count} acompanhar
              </p>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-500">
            Curadoria de{' '}
            {new Date(selectedDate).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          {loading ? (
            <p className="text-sm text-ink-400">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-ink-400">Nenhuma notícia registrada neste dia.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
