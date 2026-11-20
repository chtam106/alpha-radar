import { useCallback, useEffect, useState } from 'react';

const WATCHLIST_STORAGE_KEY = 'crypto-dashboard:watchlist';

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

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(readWatchlist);

  useEffect(() => {
    try {
      window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch (error) {
      console.error('Unable to save the watchlist.', error);
    }
  }, [watchlist]);

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === WATCHLIST_STORAGE_KEY) {
        setWatchlist(parseWatchlist(event.newValue));
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
    setWatchlist((current) =>
      current.includes(normalizedSymbol)
        ? current.filter((symbol) => symbol !== normalizedSymbol)
        : [...current, normalizedSymbol]
    );
  }, []);

  return { watchlist, isWatchlisted, toggleWatchlist };
}
