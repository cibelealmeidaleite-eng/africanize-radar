const CATEGORY_FILTERS = [
  'Música',
  'Cinema',
  'TV',
  'Esportes',
  'Moda',
  'Beleza',
  'Creator',
  'Cultura',
];

interface Props {
  active: string;
  onChange: (value: string) => void;
  search: string;
  onSearch: (value: string) => void;
  priorityOnly: boolean;
  onTogglePriority: () => void;
}

export default function Filters({ active, onChange, search, onSearch, priorityOnly, onTogglePriority }: Props) {
  const chips = [
    { key: 'all', label: 'Todas' },
    { key: 'HOT', label: '🔥 Pauta quente' },
    { key: 'WATCH', label: '👀 Acompanhar' },
    ...CATEGORY_FILTERS.map((c) => ({ key: c, label: c })),
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => onChange(chip.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              active === chip.key
                ? 'bg-ink-950 text-white'
                : 'bg-white text-ink-600 border border-ink-200 hover:border-ink-400'
            }`}
          >
            {chip.label}
          </button>
        ))}
        <button
          onClick={onTogglePriority}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            priorityOnly
              ? 'bg-ember-500 text-white'
              : 'bg-white text-ink-600 border border-ink-200 hover:border-ink-400'
          }`}
        >
          ★ Alta prioridade
        </button>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Buscar por pessoa ou título..."
        className="w-full sm:w-64 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-500"
      />
    </div>
  );
}
