import { useState } from 'react';
import type { NewsItem } from '../lib/types';
import NewsDetailModal from './NewsDetailModal';

const classificationStyles: Record<NewsItem['classification'], string> = {
  HOT: 'bg-ember-500 text-white',
  WATCH: 'bg-gold-500/20 text-ink-900 border border-gold-500/50',
  DISCARD: 'bg-ink-200 text-ink-500',
};

function formatDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  item: NewsItem;
  onSave?: (id: string) => void;
  onDiscard?: (id: string) => void;
  compact?: boolean;
}

export default function NewsCard({ item, onSave, onDiscard, compact }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <article
        className={`group relative rounded-xl border border-ink-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-ink-300 transition-all cursor-pointer ${
          item.is_alert ? 'ring-2 ring-ember-500' : ''
        }`}
        onClick={() => setOpen(true)}
      >
        {item.is_alert && (
          <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-ember-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-ember-600">
            🚨 ALERTA — {item.alert_reason ?? 'checagem urgente'}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-ember-600">
              {item.person_name}
            </p>
            <h3 className="mt-1 font-display text-base font-semibold leading-snug text-ink-950 line-clamp-2">
              {item.title}
            </h3>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${classificationStyles[item.classification]}`}
          >
            {item.classification}
          </span>
        </div>

        {!compact && (
          <p className="mt-2 text-sm text-ink-500 line-clamp-2">{item.summary}</p>
        )}

        <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-400">
          <span className="font-medium text-ink-500">{item.source_name}</span>
          <span>&middot;</span>
          <span>{formatDate(item.published_at ?? item.found_at)}</span>
          <span>&middot;</span>
          <span className="font-mono">{item.relevance_score.toFixed(0)}/10</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {item.recommended_format?.map((f) => (
            <span
              key={f}
              className="rounded bg-ink-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500"
            >
              {f}
            </span>
          ))}
        </div>

        {(onSave || onDiscard) && (
          <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
            {onSave && (
              <button
                onClick={() => onSave(item.id)}
                className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-100"
              >
                {item.status === 'Salva' ? '⭐ Salva' : '☆ Salvar'}
              </button>
            )}
            {onDiscard && (
              <button
                onClick={() => onDiscard(item.id)}
                className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-400 hover:bg-ink-100"
              >
                Descartar
              </button>
            )}
          </div>
        )}
      </article>

      {open && <NewsDetailModal item={item} onClose={() => setOpen(false)} />}
    </>
  );
}
