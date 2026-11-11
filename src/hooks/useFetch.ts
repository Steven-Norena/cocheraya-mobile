import { useState, useEffect, useCallback, useRef } from 'react';

export function useFetch<T>(
  fetchFn: (signal?: AbortSignal) => Promise<T>, 
  immediate = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);
  
  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    // Abort previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchFnRef.current(controller.signal);
      setData(response);
      setError(null);
      return response;
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        // Request was cancelled, ignore state update
        return;
      }
      const errMsg = err.response?.data?.message || err.message || 'Error al obtener los datos';
      setError(errMsg);
      throw err;
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [execute, immediate]);

  return { data, loading, error, execute, setData };
}

export default useFetch;
