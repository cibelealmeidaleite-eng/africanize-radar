import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { NewsItem } from '../lib/types';

export interface NewsFilters {
  classification?: 'HOT' | 'WATCH' | 'all';
  category?: string;
  priorityOnly?: boolean;
  search?: string;
  dateFrom?: string; // ISO date, inclusive
  dateTo?: string; // ISO date, inclusive
}

/**
 * Loads news_items joined with the person's name/priority, for a given date
 * range (defaults to "today" in the UI layer). Discarded items are excluded
 * by default, matching rule #10: "Não mostrar todos os descartes no painel
 * principal."
 */
export function useNews(filters: NewsFilters = {}) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('news_items')
      .select('*, people(name, priority)')
      .eq('is_duplicate', false)
      .neq('status', 'Descartada')
      .order('relevance_score', { ascending: false })
      .order('found_at', { ascending: false })
      .limit(300);

    if (filters.classification && filters.classification !== 'all') {
      query = query.eq('classification', filters.classification);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.dateFrom) {
      query = query.gte('found_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('found_at', filters.dateTo);
    }

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    let mapped: NewsItem[] = (data ?? []).map((row: any) => ({
      ...row,
      person_name: row.people?.name ?? 'Desconhecido',
    }));

    if (filters.priorityOnly) {
      mapped = mapped.filter((n: any) => n.people?.priority === 'Alta');
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      mapped = mapped.filter(
        (n) => n.person_name?.toLowerCase().includes(q) || n.title.toLowerCase().includes(q)
      );
    }

    setError(null);
    setItems(mapped);
    setLoading(false);
  }, [
    filters.classification,
    filters.category,
    filters.priorityOnly,
    filters.search,
    filters.dateFrom,
    filters.dateTo,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setStatus = useCallback(
    async (id: string, status: NewsItem['status']) => {
      const { error: err } = await supabase.from('news_items').update({ status }).eq('id', id);
      if (err) throw new Error(err.message);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, status } : n)));
    },
    []
  );

  const alerts = useMemo(() => items.filter((n) => n.is_alert), [items]);
  const hot = useMemo(() => items.filter((n) => n.classification === 'HOT'), [items]);
  const watch = useMemo(() => items.filter((n) => n.classification === 'WATCH'), [items]);

  return { items, hot, watch, alerts, loading, error, refresh, setStatus };
}
