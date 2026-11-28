import { useCallback, useEffect, useRef, useState } from 'react';

const WATCHLIST_STORAGE_KEY = 'crypto-dashboard:watchlist';

export type WatchlistFeedback = 'added' | 'removed' | 'cleared' | 'error' | null;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((symbol: unknown) => typeof symbol === 'string');
}

function parseWatchlist(value: string | null): string[] {
  if (!value) {
    return [];
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch (error) {
    console.error('Unable to parse the saved watchlist.', error);
    return [];
  }

  if (!isStringArray(parsedValue)) {
    console.error('The saved watchlist has an unexpected format.');
    return [];
  }

  return Array.from(
    new Set(
      parsedValue.map((symbol) => symbol.trim().toUpperCase()).filter((symbol) => symbol.length > 0)
    )
  );
}

function readWatchlist(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    return parseWatchlist(window.localStorage.getItem(WATCHLIST_STORAGE_KEY));
  } catch (error) {
    console.error('Unable to access the saved watchlist.', error);
    return [];
  }
}

// Browsers only fire `storage` in other tabs, so tell other hook instances in this tab too.
function notifySameTab(newValue: string) {
  window.dispatchEvent(new StorageEvent('storage', { key: WATCHLIST_STORAGE_KEY, newValue }));
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(readWatchlist);
  const watchlistRef = useRef(watchlist);
  const [feedback, setFeedback] = useState<WatchlistFeedback>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlistRef.current));
    } catch (error) {
      console.error('Unable to save the watchlist.', error);
    }
  }, []);

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === WATCHLIST_STORAGE_KEY) {
        const nextWatchlist = parseWatchlist(event.newValue);
        watchlistRef.current = nextWatchlist;
        setWatchlist(nextWatchlist);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isWatchlisted = useCallback(
    (futuresSymbol: string) => watchlist.includes(futuresSymbol.toUpperCase()),
    [watchlist]
  );

  const toggleWatchlist = useCallback((futuresSymbol: string) => {
    const normalizedSymbol = futuresSymbol.toUpperCase();
    const removing = watchlistRef.current.includes(normalizedSymbol);
    const nextWatchlist = removing
      ? watchlistRef.current.filter((symbol) => symbol !== normalizedSymbol)
      : [...watchlistRef.current, normalizedSymbol];
    const serializedWatchlist = JSON.stringify(nextWatchlist);
    try {
      window.localStorage.setItem(WATCHLIST_STORAGE_KEY, serializedWatchlist);
    } catch (error) {
      console.error('Unable to save the watchlist.', error);
      setFeedback('error');
      return;
    }

    watchlistRef.current = nextWatchlist;
    setWatchlist(nextWatchlist);
    setFeedback(removing ? 'removed' : 'added');
    notifySameTab(serializedWatchlist);
  }, []);
  const clearWatchlist = useCallback(() => {
    if (watchlistRef.current.length === 0) return;

    try {
      window.localStorage.setItem(WATCHLIST_STORAGE_KEY, '[]');
    } catch (error) {
      console.error('Unable to save the watchlist.', error);
      setFeedback('error');
      return;
    }

    watchlistRef.current = [];
    setWatchlist([]);
    setFeedback('cleared');
    notifySameTab('[]');
  }, []);
  const clearFeedback = useCallback(() => setFeedback(null), []);

  return { watchlist, isWatchlisted, toggleWatchlist, clearWatchlist, feedback, clearFeedback };
}
