import { useState } from 'react';
import { parseIcsForPeople, type IcsCandidate, type ParseResult } from '../lib/icsParser';
import { usePeople } from '../hooks/usePeople';
import type { PersonCategory, Priority } from '../lib/types';

export default function ImportIcs() {
  const { addManyPeople, people } = usePeople();
  const [result, setResult] = useState<ParseResult | null>(null);
  const [candidates, setCandidates] = useState<IcsCandidate[]>([]);
  const [showPossible, setShowPossible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<PersonCategory>('Outro');
  const [defaultPriority, setDefaultPriority] = useState<Priority>('Média');
  const [fileName, setFileName] = useState<string | null>(null);

  const existingNames = new Set(people.map((p) => p.name.toLowerCase()));

  function handleFile(file: File) {
    setFileName(file.name);
    setImported(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseIcsForPeople(text);
      setResult(parsed);
      setCandidates(parsed.strongCandidates);
    };
    reader.readAsText(file);
  }

  function toggle(name: string) {
    setCandidates((prev) =>
      prev.map((c) => (c.name === name ? { ...c, selected: !c.selected } : c))
    );
  }

  function editName(oldName: string, newName: string) {
    setCandidates((prev) =>
      prev.map((c) => (c.name === oldName ? { ...c, name: newName } : c))
    );
  }

  function addManual() {
    const name = prompt('Nome da pessoa a adicionar:');
    if (!name?.trim()) return;
    setCandidates((prev) => [
      { name: name.trim(), occurrences: 0, matchType: 'outro', sampleSummary: 'Adicionado manualmente', selected: true },
      ...prev,
    ]);
  }

  function movePossibleToMain(c: IcsCandidate) {
    setCandidates((prev) => [c, ...prev]);
    setResult((prev) =>
      prev
        ? { ...prev, possibleCandidates: prev.possibleCandidates.filter((p) => p.name !== c.name) }
        : prev
    );
  }

  async function handleConfirmImport() {
    const selected = candidates.filter((c) => c.selected && !existingNames.has(c.name.toLowerCase()));
    if (selected.length === 0) return;
    setImporting(true);
    try {
      await addManyPeople(
        selected.map((c) => ({
          name: c.name,
          category: defaultCategory,
          priority: defaultPriority,
          active: true,
          aliases: [],
          topics: [],
        }))
      );
      setImported(selected.length);
      setCandidates([]);
      setResult(null);
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = candidates.filter((c) => c.selected).length;
  const alreadyExistsCount = candidates.filter((c) => existingNames.has(c.name.toLowerCase())).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Importar calendário</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">
          Envie o arquivo <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">.ics</code> do
          calendário de produção. Ele é usado apenas como fonte inicial para identificar nomes de
          pessoas — o calendário em si não é usado como calendário editorial dentro do Radar, e
          não é necessário para o funcionamento diário depois desta importação.
        </p>
      </div>

      {!result && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-300 bg-white p-12 text-center hover:border-ember-500">
          <span className="font-display text-lg font-semibold text-ink-800">
            Arraste o arquivo .ics aqui ou clique para selecionar
          </span>
          <span className="text-sm text-ink-400">Formato aceito: .ics (iCalendar)</span>
          <input
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      )}

      {result && (
        <>
          <div className="rounded-xl border border-ink-200 bg-white p-4 text-sm text-ink-600">
            <p>
              <span className="font-semibold text-ink-900">{fileName}</span> &middot;{' '}
              {result.totalEvents} eventos analisados &middot;{' '}
              <span className="font-semibold text-ember-600">
                {result.strongCandidates.length} candidatos a pessoas
              </span>{' '}
              identificados com alta confiança
              {result.possibleCandidates.length > 0 && (
                <>
                  {' '}
                  &middot; {result.possibleCandidates.length} candidatos adicionais de baixa
                  confiança disponíveis para revisão
                </>
              )}
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-ink-500">Categoria padrão</label>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value as PersonCategory)}
                className="rounded-lg border border-ink-200 px-2 py-1.5 text-sm"
              >
                {[
                  'Música', 'Cinema', 'TV', 'Streaming', 'Esportes', 'Moda', 'Beleza',
                  'Creator', 'Influenciador', 'Cultura', 'Política', 'Direitos Humanos',
                  'Negócios', 'Outro',
                ].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-ink-500">Prioridade padrão</label>
              <select
                value={defaultPriority}
                onChange={(e) => setDefaultPriority(e.target.value as Priority)}
                className="rounded-lg border border-ink-200 px-2 py-1.5 text-sm"
              >
                {['Alta', 'Média', 'Baixa'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addManual}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
            >
              + Adicionar nome manualmente
            </button>
            <button
              onClick={() => {
                setResult(null);
                setCandidates([]);
              }}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-400 hover:bg-ink-100"
            >
              Reiniciar importação
            </button>
          </div>

          <div className="rounded-xl border border-ink-200 bg-white">
            <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
              <p className="text-sm font-semibold text-ink-800">
                {selectedCount} de {candidates.length} selecionados
                {alreadyExistsCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-ink-400">
                    ({alreadyExistsCount} já existem no banco e serão ignorados)
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCandidates((prev) => prev.map((c) => ({ ...c, selected: true })))}
                  className="text-xs font-medium text-ink-500 hover:text-ink-900"
                >
                  Selecionar todos
                </button>
                <button
                  onClick={() => setCandidates((prev) => prev.map((c) => ({ ...c, selected: false })))}
                  className="text-xs font-medium text-ink-500 hover:text-ink-900"
                >
                  Limpar seleção
                </button>
              </div>
            </div>
            <ul className="max-h-[480px] divide-y divide-ink-100 overflow-y-auto scrollbar-thin">
              {candidates.map((c) => {
                const exists = existingNames.has(c.name.toLowerCase());
                return (
                  <li
                    key={c.name}
                    className={`flex items-center gap-3 px-4 py-2.5 ${exists ? 'opacity-40' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={c.selected}
                      disabled={exists}
                      onChange={() => toggle(c.name)}
                    />
                    <input
                      value={c.name}
                      disabled={exists}
                      onChange={(e) => editName(c.name, e.target.value)}
                      className="flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-ink-900 hover:border-ink-200 focus:border-ember-500 focus:outline-none"
                    />
                    <span className="shrink-0 text-xs text-ink-400">
                      {c.occurrences > 0 ? `${c.occurrences}× no calendário` : 'manual'}
                    </span>
                    {exists && (
                      <span className="shrink-0 text-xs font-medium text-ink-400">já cadastrado</span>
                    )}
                    <button
                      onClick={() => setCandidates((prev) => prev.filter((x) => x.name !== c.name))}
                      className="shrink-0 text-xs text-ember-500 hover:text-ember-700"
                    >
                      remover
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {result.possibleCandidates.length > 0 && (
            <div className="rounded-xl border border-ink-200 bg-white p-4">
              <button
                onClick={() => setShowPossible((v) => !v)}
                className="text-sm font-semibold text-ink-700"
              >
                {showPossible ? '▾' : '▸'} Candidatos de baixa confiança ({result.possibleCandidates.length})
                — revisar manualmente
              </button>
              {showPossible && (
                <ul className="mt-3 max-h-64 divide-y divide-ink-100 overflow-y-auto scrollbar-thin">
                  {result.possibleCandidates.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="text-ink-700">
                        {c.name}{' '}
                        <span className="text-xs text-ink-400">— ex: "{c.sampleSummary}"</span>
                      </span>
                      <button
                        onClick={() => movePossibleToMain(c)}
                        className="shrink-0 rounded border border-ink-200 px-2 py-1 text-xs font-medium text-ink-600 hover:bg-ink-100"
                      >
                        + adicionar à lista
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleConfirmImport}
              disabled={importing || selectedCount === 0}
              className="rounded-lg bg-ember-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-600 disabled:opacity-50"
            >
              {importing ? 'Importando...' : `Confirmar importação (${selectedCount})`}
            </button>
          </div>
        </>
      )}

      {imported !== null && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          ✅ {imported} pessoas importadas com sucesso para o banco de monitoramento. Vá até{' '}
          <span className="font-semibold">Pessoas monitoradas</span> para ajustar categorias e
          prioridades.
        </div>
      )}
    </div>
  );
}
