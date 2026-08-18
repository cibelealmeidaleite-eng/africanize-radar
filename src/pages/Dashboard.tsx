import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNews } from '../hooks/useNews';
import { usePeople } from '../hooks/usePeople';
import NewsCard from '../components/NewsCard';
import Filters from '../components/Filters';
import SummaryStats from '../components/SummaryStats';
import RunRadarButton from '../components/RunRadarButton';
import type { NewsItem, RadarRun } from '../lib/types';

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function Dashboard() {
  const [classification, setClassification] = useState('all');
  const [search, setSearch] = useState('');
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [lastRun, setLastRun] = useState<RadarRun | null>(null);

  const isCategory = !['all', 'HOT', 'WATCH'].includes(classification);

  const { items, hot, watch, alerts, loading, refresh, setStatus } = useNews({
    classification: classification === 'all' || isCategory ? 'all' : (classification as 'HOT' | 'WATCH'),
    category: isCategory ? classification : undefined,
    search,
    priorityOnly,
  });

  const { people } = usePeople();

  async function loadLastRun() {
    const { data } = await supabase
      .from('radar_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastRun((data as RadarRun) ?? null);
  }

  useEffect(() => {
    loadLastRun();
  }, []);

  const topThree: NewsItem[] = [...hot]
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Africanize Radar</h1>
          <p className="mt-1 text-sm text-ink-500">
            Última atualização:{' '}
            {lastRun?.finished_at
              ? new Date(lastRun.finished_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'ainda não executado'}
          </p>
        </div>
        <RunRadarButton
          onFinished={() => {
            refresh();
            loadLastRun();
          }}
        />
      </div>

      <SummaryStats
        peopleCount={people.filter((p) => p.active).length}
        newsFound={lastRun?.news_found ?? items.length}
        hotCount={lastRun?.hot_count ?? hot.length}
        watchCount={lastRun?.watch_count ?? watch.length}
      />

      {alerts.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ember-600">
            🚨 Alertas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((item) => (
              <NewsCard key={item.id} item={item} onSave={(id) => setStatus(id, 'Salva')} />
            ))}
          </div>
        </section>
      )}

      {topThree.length > 0 && classification === 'all' && !search && !priorityOnly && (
        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-500">
            As 3 principais pautas de hoje
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {topThree.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                onSave={(id) => setStatus(id, 'Salva')}
                onDiscard={(id) => setStatus(id, 'Descartada')}
              />
            ))}
          </div>
        </section>
      )}

      <Filters
        active={classification}
        onChange={setClassification}
        search={search}
        onSearch={setSearch}
        priorityOnly={priorityOnly}
        onTogglePriority={() => setPriorityOnly((v) => !v)}
      />

      <section>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-500">
          🔥 Pautas quentes
        </h2>
        {loading ? (
          <p className="text-sm text-ink-400">Carregando...</p>
        ) : hot.length === 0 ? (
          <p className="text-sm text-ink-400">Nenhuma pauta quente no momento.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hot
              .filter((n) => classification === 'all' || classification === 'HOT' || isCategory)
              .map((item) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  onSave={(id) => setStatus(id, 'Salva')}
                  onDiscard={(id) => setStatus(id, 'Descartada')}
                />
              ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-500">
          👀 Acompanhar
        </h2>
        {watch.length === 0 ? (
          <p className="text-sm text-ink-400">Nada para acompanhar no momento.</p>
        ) : (
          <div className="space-y-2">
            {watch
              .filter((n) => classification === 'all' || classification === 'WATCH' || isCategory)
              .map((item) => (
                <NewsCard key={item.id} item={item} compact onSave={(id) => setStatus(id, 'Salva')} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
