import { useState } from 'react';

interface Props {
  onFinished?: () => void;
}

export default function RunRadarButton({ onFinished }: Props) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleRun() {
    setRunning(true);
    setMessage(null);
    setIsError(false);
    try {
      const res = await fetch('/.netlify/functions/run-radar', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error ?? 'Falha ao executar o radar');
      setMessage(
        `Concluído: ${data.newsFound ?? 0} notícias encontradas, ${data.hotCount ?? 0} pautas quentes. ` +
          `(checou ${data.peopleChecked ?? 0} de ${data.peopleTotal ?? 0} pessoas ativas nesta rodada — ` +
          `o restante entra automaticamente na próxima execução)`
      );
      onFinished?.();
    } catch (e: any) {
      setIsError(true);
      setMessage(
        e.message === 'Unexpected end of JSON input' || e.message?.includes('Unexpected token')
          ? 'A execução demorou demais e foi interrompida pelo Netlify. Tente reduzir o número de pessoas ativas em "Pessoas monitoradas".'
          : (e.message ?? 'Erro ao executar o radar')
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleRun}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {running ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-ember-500" />
            Executando radar...
          </>
        ) : (
          <>▶ Executar radar agora</>
        )}
      </button>
      {message && (
        <p className={`max-w-xs text-right text-xs ${isError ? 'text-ember-600' : 'text-ink-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
