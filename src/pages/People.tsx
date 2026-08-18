import { useState } from 'react';
import { usePeople } from '../hooks/usePeople';
import type { Person, PersonCategory, Priority } from '../lib/types';

const CATEGORIES: PersonCategory[] = [
  'Música',
  'Cinema',
  'TV',
  'Streaming',
  'Esportes',
  'Moda',
  'Beleza',
  'Creator',
  'Influenciador',
  'Cultura',
  'Política',
  'Direitos Humanos',
  'Negócios',
  'Outro',
];
const PRIORITIES: Priority[] = ['Alta', 'Média', 'Baixa'];

function emptyForm(): Partial<Person> {
  return { name: '', category: 'Outro', priority: 'Média', country: '', active: true };
}

export default function People() {
  const { people, loading, addPerson, updatePerson, deletePerson, bulkSetActive } = usePeople();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [form, setForm] = useState<Partial<Person>>(emptyForm());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(p: Person) {
    setEditing(p);
    setForm(p);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      setErrorMsg('Nome é obrigatório.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      if (editing) {
        await updatePerson(editing.id, form);
      } else {
        await addPerson(form);
      }
      setShowForm(false);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = people.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Pessoas monitoradas</h1>
          <p className="mt-1 text-sm text-ink-500">{people.length} pessoas no banco de monitoramento</p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-ember-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ember-600"
        >
          + Adicionar pessoa
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full max-w-sm rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-500"
        />
        <button
          onClick={async () => {
            const ids = filtered.filter((p) => p.active).map((p) => p.id);
            if (ids.length === 0) return;
            if (
              !confirm(
                `Desativar ${ids.length} pessoas${search ? ' (filtradas pela busca)' : ''}? Isso não apaga ninguém, só tira do monitoramento — dá pra reativar quando quiser.`
              )
            )
              return;
            setBulkBusy(true);
            try {
              await bulkSetActive(ids, false);
            } finally {
              setBulkBusy(false);
            }
          }}
          disabled={bulkBusy}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-50"
        >
          {bulkBusy ? 'Processando...' : `Desativar todos${search ? ' (filtrados)' : ''}`}
        </button>
        <button
          onClick={async () => {
            const ids = filtered.filter((p) => !p.active).map((p) => p.id);
            if (ids.length === 0) return;
            if (
              !confirm(`Ativar ${ids.length} pessoas${search ? ' (filtradas pela busca)' : ''}?`)
            )
              return;
            setBulkBusy(true);
            try {
              await bulkSetActive(ids, true);
            } finally {
              setBulkBusy(false);
            }
          }}
          disabled={bulkBusy}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-50"
        >
          {bulkBusy ? 'Processando...' : `Ativar todos${search ? ' (filtrados)' : ''}`}
        </button>
        <p className="text-xs text-ink-400">
          Dica: use a busca pra achar um grupo (ex: "Beyoncé") e desativar/ativar só esses, ou deixe a
          busca vazia pra afetar todo mundo. O radar só processa pessoas ativas.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">País</th>
              <th className="px-4 py-3">Prioridade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Última notícia</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-400">
                  Nenhuma pessoa cadastrada ainda. Use "Importar calendário" ou "+ Adicionar pessoa".
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50">
                <td className="px-4 py-3 font-medium text-ink-900">{p.name}</td>
                <td className="px-4 py-3 text-ink-600">{p.category}</td>
                <td className="px-4 py-3 text-ink-600">{p.country || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.priority === 'Alta'
                        ? 'bg-ember-500/10 text-ember-600'
                        : p.priority === 'Média'
                          ? 'bg-gold-500/10 text-gold-500'
                          : 'bg-ink-100 text-ink-400'
                    }`}
                  >
                    {p.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => updatePerson(p.id, { active: !p.active })}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.active ? 'bg-green-500/10 text-green-700' : 'bg-ink-100 text-ink-400'
                    }`}
                  >
                    {p.active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {p.last_news_at ? new Date(p.last_news_at).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(p)}
                    className="mr-2 text-xs font-medium text-ink-500 hover:text-ink-900"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover ${p.name} do monitoramento?`)) deletePerson(p.id);
                    }}
                    className="text-xs font-medium text-ember-600 hover:text-ember-700"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-bold text-ink-950">
              {editing ? 'Editar pessoa' : 'Adicionar pessoa'}
            </h2>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-ink-500">Nome</label>
                <input
                  value={form.name ?? ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-500">
                  Aliases (separados por vírgula)
                </label>
                <input
                  value={(form.aliases ?? []).join(', ')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      aliases: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-500">Categoria</label>
                  <select
                    value={form.category ?? 'Outro'}
                    onChange={(e) => setForm({ ...form, category: e.target.value as PersonCategory })}
                    className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-500">Prioridade</label>
                  <select
                    value={form.priority ?? 'Média'}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                    className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-500">País</label>
                <input
                  value={form.country ?? ''}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-500">
                  Tópicos de interesse (separados por vírgula)
                </label>
                <input
                  value={(form.topics ?? []).join(', ')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      topics: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={form.active ?? true}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Monitoramento ativo
              </label>
            </div>

            {errorMsg && <p className="mt-3 text-sm text-ember-600">{errorMsg}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-ember-500 px-4 py-2 text-sm font-semibold text-white hover:bg-ember-600 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
