const CMC_LISTING_URL = import.meta.env.VITE_CMC_LISTING_URL;
const FUTURES_TOKEN_INFO_ENDPOINT = CMC_LISTING_URL
  ? new URL('/futures-token-info', CMC_LISTING_URL).href
  : import.meta.env.DEV
    ? '/futures-token-info'
    : '';
const MAX_CONCURRENT_REQUESTS = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function fetchFuturesUnlockedPercent(
  symbol: string,
  signal?: AbortSignal
): Promise<number | null> {
  if (!FUTURES_TOKEN_INFO_ENDPOINT) {
    return null;
  }

  const url = new URL(FUTURES_TOKEN_INFO_ENDPOINT, window.location.origin);
  url.searchParams.set('symbol', symbol.toUpperCase());
  const response = await fetch(url, { signal });
  if (!response.ok) {
    return null;
  }

  const payload: unknown = await response.json();
  return isRecord(payload) &&
    isRecord(payload.token) &&
    typeof payload.token.unlockedPercent === 'number'
    ? payload.token.unlockedPercent
    : null;
}

export async function fetchFuturesUnlockedPercents(
  symbols: string[],
  signal?: AbortSignal
): Promise<Map<string, number>> {
  const unlockedPercents = new Map<string, number>();
  const pendingSymbols = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))];

  async function fetchNext(): Promise<void> {
    for (let symbol = pendingSymbols.shift(); symbol; symbol = pendingSymbols.shift()) {
      const unlockedPercent = await fetchFuturesUnlockedPercent(symbol, signal).catch(() => null);
      if (unlockedPercent !== null) {
        unlockedPercents.set(symbol, unlockedPercent);
      }
    }
  }

  await Promise.all(Array.from({ length: MAX_CONCURRENT_REQUESTS }, fetchNext));
  signal?.throwIfAborted();
  return unlockedPercents;
}
