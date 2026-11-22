const FUTURES_TOKEN_INFO_ENDPOINT =
  'https://www.binance.com/bapi/apex/v1/friendly/apex/marketing/web/token-info';

export const FUTURES_TOKEN_SYMBOL_PATTERN = /^[A-Z0-9]{1,30}$/;

export interface FuturesTokenSupply {
  circulatingSupply: number;
  totalSupply: number;
  unlockedPercent: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSupply(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  const supply = Number(value);
  return Number.isFinite(supply) ? supply : null;
}

export async function fetchFuturesTokenSupply(symbol: string): Promise<FuturesTokenSupply | null> {
  const url = new URL(FUTURES_TOKEN_INFO_ENDPOINT);
  url.searchParams.set('symbol', symbol);
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }
  });
  if (!response.ok) {
    throw new Error(`Binance Futures token-info returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || payload.code !== '000000') {
    throw new Error('Binance Futures token-info returned an unexpected response.');
  }

  if (!isRecord(payload.data)) {
    return null;
  }

  const circulatingSupply = parseSupply(payload.data.cs);
  const totalSupply = parseSupply(payload.data.ts);
  if (
    circulatingSupply === null ||
    totalSupply === null ||
    circulatingSupply < 0 ||
    totalSupply <= 0 ||
    circulatingSupply > totalSupply
  ) {
    return null;
  }

  return {
    circulatingSupply,
    totalSupply,
    unlockedPercent: (circulatingSupply / totalSupply) * 100
  };
}
