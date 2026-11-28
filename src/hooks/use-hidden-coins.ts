import { useCallback, useEffect, useRef, useState } from 'react';

const HIDDEN_COINS_STORAGE_KEY = 'crypto-dashboard:hidden-coins';

export type HiddenCoinsFeedback = 'hidden' | 'unhidden' | 'cleared' | 'error' | null;

function parseHiddenCoins(value: string | null): string[] {
  if (!value) {
    return [];
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch (error) {
    console.error('Unable to parse the saved hidden coins.', error);
    return [];
  }

  if (!Array.isArray(parsedValue) || !parsedValue.every((symbol) => typeof symbol === 'string')) {
    console.error('The saved hidden coins have an unexpected format.');
    return [];
  }

  return Array.from(
    new Set(
      parsedValue.map((symbol) => symbol.trim().toUpperCase()).filter((symbol) => symbol.length > 0)
    )
  );
}

function readHiddenCoins(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    return parseHiddenCoins(window.localStorage.getItem(HIDDEN_COINS_STORAGE_KEY));
  } catch (error) {
    console.error('Unable to access the saved hidden coins.', error);
    return [];
  }
}

// Browsers only fire `storage` in other tabs, so tell other hook instances in this tab too.
function notifySameTab(newValue: string) {
  window.dispatchEvent(new StorageEvent('storage', { key: HIDDEN_COINS_STORAGE_KEY, newValue }));
}

export function useHiddenCoins() {
  const [hiddenCoins, setHiddenCoins] = useState(readHiddenCoins);
  const hiddenCoinsRef = useRef(hiddenCoins);
  const [feedback, setFeedback] = useState<HiddenCoinsFeedback>(null);

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === HIDDEN_COINS_STORAGE_KEY) {
        const nextHiddenCoins = parseHiddenCoins(event.newValue);
        hiddenCoinsRef.current = nextHiddenCoins;
        setHiddenCoins(nextHiddenCoins);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isHidden = useCallback(
    (futuresSymbol: string) => hiddenCoins.includes(futuresSymbol.trim().toUpperCase()),
    [hiddenCoins]
  );

  const updateHiddenCoin = useCallback((futuresSymbol: string, hide: boolean) => {
    const normalizedSymbol = futuresSymbol.trim().toUpperCase();
    if (!normalizedSymbol) {
      return;
    }

    const alreadyHidden = hiddenCoinsRef.current.includes(normalizedSymbol);
    if (alreadyHidden === hide) {
      return;
    }

    const nextHiddenCoins = hide
      ? [...hiddenCoinsRef.current, normalizedSymbol]
      : hiddenCoinsRef.current.filter((symbol) => symbol !== normalizedSymbol);

    const serializedHiddenCoins = JSON.stringify(nextHiddenCoins);
    try {
      window.localStorage.setItem(HIDDEN_COINS_STORAGE_KEY, serializedHiddenCoins);
    } catch (storageError) {
      console.error('Unable to save the hidden coins.', storageError);
      setFeedback('error');
      return;
    }

    hiddenCoinsRef.current = nextHiddenCoins;
    setHiddenCoins(nextHiddenCoins);
    setFeedback(hide ? 'hidden' : 'unhidden');
    notifySameTab(serializedHiddenCoins);
  }, []);

  const hideCoin = useCallback(
    (futuresSymbol: string) => updateHiddenCoin(futuresSymbol, true),
    [updateHiddenCoin]
  );
  const unhideCoin = useCallback(
    (futuresSymbol: string) => updateHiddenCoin(futuresSymbol, false),
    [updateHiddenCoin]
  );
  const clearHiddenCoins = useCallback(() => {
    if (hiddenCoinsRef.current.length === 0) return;

    try {
      window.localStorage.setItem(HIDDEN_COINS_STORAGE_KEY, '[]');
    } catch (storageError) {
      console.error('Unable to save the hidden coins.', storageError);
      setFeedback('error');
      return;
    }

    hiddenCoinsRef.current = [];
    setHiddenCoins([]);
    setFeedback('cleared');
    notifySameTab('[]');
  }, []);
  const clearFeedback = useCallback(() => setFeedback(null), []);

  return {
    hiddenCoins,
    isHidden,
    hideCoin,
    unhideCoin,
    clearHiddenCoins,
    feedback,
    clearFeedback
  };
}
