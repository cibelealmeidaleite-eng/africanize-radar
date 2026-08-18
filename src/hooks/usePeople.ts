import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Person } from '../lib/types';

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('people')
      .select('*')
      .order('priority', { ascending: true })
      .order('name', { ascending: true });
    if (err) {
      setError(err.message);
    } else {
      setError(null);
      setPeople((data ?? []) as Person[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPerson = useCallback(
    async (person: Partial<Person>) => {
      const { error: err } = await supabase.from('people').insert({
        name: person.name,
        aliases: person.aliases ?? [],
        category: person.category ?? 'Outro',
        country: person.country ?? null,
        priority: person.priority ?? 'Média',
        topics: person.topics ?? [],
        active: person.active ?? true,
      });
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh]
  );

  const addManyPeople = useCallback(
    async (items: Partial<Person>[]) => {
      if (items.length === 0) return;
      const payload = items.map((p) => ({
        name: p.name,
        aliases: p.aliases ?? [],
        category: p.category ?? 'Outro',
        country: p.country ?? null,
        priority: p.priority ?? 'Média',
        topics: p.topics ?? [],
        active: p.active ?? true,
      }));
      const { error: err } = await supabase.from('people').insert(payload);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh]
  );

  const updatePerson = useCallback(
    async (id: string, patch: Partial<Person>) => {
      const { error: err } = await supabase
        .from('people')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh]
  );

  const deletePerson = useCallback(
    async (id: string) => {
      const { error: err } = await supabase.from('people').delete().eq('id', id);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh]
  );

  const bulkSetActive = useCallback(
    async (ids: string[], active: boolean) => {
      if (ids.length === 0) return;
      const { error: err } = await supabase
        .from('people')
        .update({ active, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh]
  );

  return {
    people,
    loading,
    error,
    refresh,
    addPerson,
    addManyPeople,
    updatePerson,
    deletePerson,
    bulkSetActive,
  };
}
