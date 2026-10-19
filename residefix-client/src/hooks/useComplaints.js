import { useCallback, useEffect, useState } from 'react';
import { complaintsApi } from '../api/index.js';

export const DEFAULT_FILTERS = {
  q: '',
  status: '',
  category: '',
  priority: '',
  sort: 'newest',
  page: 1,
  limit: 10,
};

/**
 * Loads a filtered, paginated complaint list and reloads whenever the
 * filters change. Typing in the search box is debounced by 300 ms.
 */
export default function useComplaints(initial = {}) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initial });
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintsApi.list(filters);
      setItems(res.data);
      setMeta(res.meta);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  /** Replace one complaint in the list after it was edited elsewhere. */
  const replace = useCallback(
    (updated) => setItems((list) => list.map((c) => (c._id === updated._id ? { ...c, ...updated } : c))),
    []
  );

  return { filters, setFilters, items, meta, loading, error, reload: load, replace };
}
