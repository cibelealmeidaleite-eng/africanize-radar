interface Props {
  peopleCount: number;
  newsFound: number;
  hotCount: number;
  watchCount: number;
}

export default function SummaryStats({ peopleCount, newsFound, hotCount, watchCount }: Props) {
  const stats = [
    { label: 'pessoas monitoradas', value: peopleCount },
    { label: 'notícias encontradas', value: newsFound },
    { label: 'pautas quentes', value: hotCount, accent: true },
    { label: 'para acompanhar', value: watchCount },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-ink-200 bg-white px-4 py-3">
          <p
            className={`font-display text-2xl font-bold ${s.accent ? 'text-ember-500' : 'text-ink-950'}`}
          >
            {s.value}
          </p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
