const CMC_LISTING_ENDPOINT =
  import.meta.env.VITE_CMC_LISTING_URL || (import.meta.env.DEV ? '/cmc-listing' : '');

const CMC_COIN_URL = 'https://coinmarketcap.com/currencies';
const CMC_BSC_TOKEN_URL = 'https://dex.coinmarketcap.com/token/bsc';

export interface CoinMarketCapSupply {
  slug: string | null;
  circulatingSupply: number;
  totalSupply: number;
  unlockedPercent: number;
}

interface CoinMarketCapSupplyEntry {
  symbol: string;
  slug: string | null;
  name: string;
  tokenAddress: string | null;
  circulatingSupply: number;
  totalSupply: number;
  unlockedPercent: number | null;
}

export type CoinMarketCapSupplyLookup = (token: {
  symbol: string;
  name: string;
  contractAddress: string;
}) => CoinMarketCapSupply | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseEntry(value: unknown): CoinMarketCapSupplyEntry | null {
  if (
    !isRecord(value) ||
    typeof value.symbol !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.circulatingSupply !== 'number' ||
    !Number.isFinite(value.circulatingSupply) ||
    typeof value.totalSupply !== 'number' ||
    !Number.isFinite(value.totalSupply) ||
    (typeof value.unlockedPercent === 'number' &&
      (!Number.isFinite(value.unlockedPercent) ||
        value.unlockedPercent < 0 ||
        value.unlockedPercent > 100))
  ) {
    return null;
  }

  return {
    symbol: value.symbol.toUpperCase(),
    slug: typeof value.slug === 'string' && value.slug ? value.slug : null,
    name: value.name.toLowerCase(),
    tokenAddress: typeof value.tokenAddress === 'string' ? value.tokenAddress.toLowerCase() : null,
    circulatingSupply: value.circulatingSupply,
    totalSupply: value.totalSupply,
    unlockedPercent: typeof value.unlockedPercent === 'number' ? value.unlockedPercent : null
  };
}

function toSupply(entry: CoinMarketCapSupplyEntry | undefined): CoinMarketCapSupply | null {
  if (
    !entry ||
    !Number.isFinite(entry.circulatingSupply) ||
    !Number.isFinite(entry.totalSupply) ||
    entry.circulatingSupply < 0 ||
    entry.totalSupply <= 0 ||
    entry.circulatingSupply > entry.totalSupply
  ) {
    return null;
  }

  return {
    slug: entry.slug,
    circulatingSupply: entry.circulatingSupply,
    totalSupply: entry.totalSupply,
    unlockedPercent: entry.unlockedPercent ?? (entry.circulatingSupply / entry.totalSupply) * 100
  };
}

export function getCoinMarketCapUrl(token: {
  cmcSlug: string | null;
  contractAddress: string | null;
  name: string | null;
  symbol: string;
}): string {
  if (token.cmcSlug) {
    return `${CMC_COIN_URL}/${encodeURIComponent(token.cmcSlug)}/`;
  }

  if (token.contractAddress) {
    return `${CMC_BSC_TOKEN_URL}/${encodeURIComponent(token.contractAddress)}/`;
  }

  const slug =
    (token.name ?? token.symbol)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || token.symbol.toLowerCase();
  return `${CMC_COIN_URL}/${slug}/`;
}

export async function fetchCoinMarketCapSupplyLookup(
  signal?: AbortSignal
): Promise<CoinMarketCapSupplyLookup> {
  if (!CMC_LISTING_ENDPOINT) {
    throw new Error('CoinMarketCap listing proxy is not configured.');
  }

  const response = await fetch(new URL(CMC_LISTING_ENDPOINT, window.location.origin), { signal });
  if (!response.ok) {
    throw new Error(`CoinMarketCap listing proxy returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.coins)) {
    throw new Error('CoinMarketCap listing proxy returned an unexpected response.');
  }

  const entriesByAddress = new Map<string, CoinMarketCapSupplyEntry>();
  const entriesBySymbol = new Map<string, CoinMarketCapSupplyEntry[]>();
  for (const entry of payload.coins.map(parseEntry)) {
    if (!entry) {
      continue;
    }

    if (entry.tokenAddress) {
      entriesByAddress.set(entry.tokenAddress, entry);
    }
    const entries = entriesBySymbol.get(entry.symbol) ?? [];
    entries.push(entry);
    entriesBySymbol.set(entry.symbol, entries);
  }

  return ({ symbol, name, contractAddress }) => {
    const addressMatch = entriesByAddress.get(contractAddress.toLowerCase());
    if (addressMatch) {
      return toSupply(addressMatch);
    }

    const symbolMatches = entriesBySymbol.get(symbol.toUpperCase()) ?? [];
    const nameMatches = symbolMatches.filter((entry) => entry.name === name.toLowerCase());
    if (nameMatches.length === 1) {
      return toSupply(nameMatches[0]);
    }

    return symbolMatches.length === 1 ? toSupply(symbolMatches[0]) : null;
  };
}
