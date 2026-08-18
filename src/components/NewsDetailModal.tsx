import type { NewsItem } from '../lib/types';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) +
    ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function NewsDetailModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ember-600">
              {item.person_name} &middot; {item.category}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold leading-snug text-ink-950">
              {item.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ink-950 px-2.5 py-1 text-[11px] font-bold text-white">
            {item.classification}
          </span>
          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-mono font-semibold text-ink-700">
            relevância {item.relevance_score.toFixed(0)}/10
          </span>
          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-500">
            {item.status}
          </span>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-ink-700">{item.summary}</p>

        <div className="mt-5 rounded-xl bg-ink-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Por que importa para a Africanize
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-800">{item.why_it_matters}</p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-ink-400">Fonte</dt>
            <dd className="mt-0.5 font-medium text-ink-800">{item.source_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-400">Publicado em</dt>
            <dd className="mt-0.5 font-medium text-ink-800">{formatDate(item.published_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-400">Encontrado em</dt>
            <dd className="mt-0.5 font-medium text-ink-800">{formatDate(item.found_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-400">Formato recomendado</dt>
            <dd className="mt-0.5 font-medium text-ink-800">
              {item.recommended_format?.join(', ') || '—'}
            </dd>
          </div>
        </dl>

        {item.sources && item.sources.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium text-ink-400">Outras fontes que cobriram isso</p>
            <ul className="mt-1.5 space-y-1">
              {item.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-ember-600 hover:underline"
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <a
          href={item.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-ember-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ember-600"
        >
          Ler notícia original ↗
        </a>
      </div>
    </div>
  );
}
