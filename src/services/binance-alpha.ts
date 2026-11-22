import { fetchCoinMarketCapSupplyLookup } from '@/services/coinmarketcap';
import {
  fetchFuturesUnlockedPercent,
  fetchFuturesUnlockedPercents
} from '@/services/futures-token-info';

const TOKEN_LIST_ENDPOINT =
  'https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list';
const SPOT_MARKET_INFO_ENDPOINT = 'https://api.binance.com/api/v3/exchangeInfo';
const FUTURES_MARKET_INFO_ENDPOINT = 'https://fapi.binance.com/fapi/v1/exchangeInfo';

const BSC_CHAIN_ID = '56';
const MAX_UNLOCKED_PERCENT = 35;

export interface BscAlphaToken {
  tokenId: string;
  name: string;
  symbol: string;
  futuresSymbol: string;
  contractAddress: string;
  cmcSlug: string | null;
  iconUrl: string | null;
  price: number | null;
  marketCap: number | null;
  fdv: number | null;
  circulatingSupply: number;
  totalSupply: number;
  unlockedPercent: number;
}

export interface BscAlphaTokenMetrics {
  symbol: string;
  name: string | null;
  contractAddress: string | null;
  cmcSlug: string | null;
  marketCap: number | null;
  fdv: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  unlockedPercent: number | null;
}

type SupplyMetrics = Pick<
  BscAlphaTokenMetrics,
  'circulatingSupply' | 'totalSupply' | 'unlockedPercent'
>;
type AlphaTokenCandidate = Omit<BscAlphaToken, 'futuresSymbol' | 'cmcSlug' | keyof SupplyMetrics> &
  SupplyMetrics;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseSupplyMetrics(value: Record<string, unknown>): SupplyMetrics {
  const circulatingSupply = parseNumericValue(value.circulatingSupply);
  const totalSupply = parseNumericValue(value.totalSupply);
  const unlockedPercent =
    circulatingSupply !== null &&
    totalSupply !== null &&
    circulatingSupply >= 0 &&
    totalSupply > 0 &&
    circulatingSupply <= totalSupply
      ? (circulatingSupply / totalSupply) * 100
      : null;

  return { circulatingSupply, totalSupply, unlockedPercent };
}

function parseCurrentTokenMetrics(value: unknown): BscAlphaTokenMetrics | null {
  if (
    !isRecord(value) ||
    String(value.chainId) !== BSC_CHAIN_ID ||
    value.offline === true ||
    value.fullyDelisted === true ||
    typeof value.symbol !== 'string'
  ) {
    return null;
  }

  return {
    symbol: value.symbol.toUpperCase(),
    name: typeof value.name === 'string' ? value.name : null,
    contractAddress: typeof value.contractAddress === 'string' ? value.contractAddress : null,
    cmcSlug: null,
    marketCap: parseNumericValue(value.marketCap),
    fdv: parseNumericValue(value.fdv),
    ...parseSupplyMetrics(value)
  };
}

function parseAlphaTokenCandidate(value: unknown): AlphaTokenCandidate | null {
  if (!isRecord(value) || String(value.chainId) !== BSC_CHAIN_ID) {
    return null;
  }

  if (value.offline === true || value.fullyDelisted === true) {
    return null;
  }

  const tokenId = value.tokenId;
  const name = value.name;
  const symbol = value.symbol;
  const contractAddress = value.contractAddress;

  if (
    typeof tokenId !== 'string' ||
    typeof name !== 'string' ||
    typeof symbol !== 'string' ||
    typeof contractAddress !== 'string'
  ) {
    return null;
  }

  return {
    tokenId,
    name,
    symbol,
    contractAddress,
    iconUrl: typeof value.iconUrl === 'string' ? value.iconUrl : null,
    price: parseNumericValue(value.price),
    marketCap: parseNumericValue(value.marketCap),
    fdv: parseNumericValue(value.fdv),
    ...parseSupplyMetrics(value)
  };
}

export async function fetchBscAlphaTokenMetrics(
  futuresSymbol: string,
  signal?: AbortSignal
): Promise<BscAlphaTokenMetrics | null> {
  const normalizedSymbol = futuresSymbol.toUpperCase();
  if (!/^[A-Z0-9]{2,30}(?:USDT|USDC)$/.test(normalizedSymbol)) {
    throw new Error('Invalid Futures symbol.');
  }

  const baseAsset = normalizedSymbol.replace(/(?:USDT|USDC)$/, '');
  const [payload, findCoinMarketCapSupply, futuresUnlockedPercent] = await Promise.all([
    fetchJson(TOKEN_LIST_ENDPOINT, signal),
    fetchCoinMarketCapSupplyLookup(signal).catch(() => null),
    fetchFuturesUnlockedPercent(baseAsset, signal).catch(() => null)
  ]);
  if (!isRecord(payload) || payload.code !== '000000' || !Array.isArray(payload.data)) {
    throw new Error('Binance returned an unexpected Alpha token list response.');
  }

  const matches = payload.data
    .map(parseCurrentTokenMetrics)
    .filter((token): token is BscAlphaTokenMetrics => token !== null)
    .filter((token) => token.symbol === baseAsset);

  if (matches.length !== 1) {
    return null;
  }

  const [token] = matches;
  const coinMarketCapSupply =
    token.name && token.contractAddress
      ? (findCoinMarketCapSupply?.({
          symbol: token.symbol,
          name: token.name,
          contractAddress: token.contractAddress
        }) ?? null)
      : null;
  return {
    ...token,
    cmcSlug: coinMarketCapSupply?.slug ?? null,
    unlockedPercent:
      futuresUnlockedPercent ?? coinMarketCapSupply?.unlockedPercent ?? token.unlockedPercent
  };
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Binance API returned HTTP ${response.status}.`);
  }

  return response.json();
}

function getListedSpotAssets(payload: unknown): Set<string> {
  if (!isRecord(payload) || !Array.isArray(payload.symbols)) {
    throw new Error('Binance returned an unexpected spot market list response.');
  }

  const assets = new Set<string>();
  for (const value of payload.symbols) {
    if (
      isRecord(value) &&
      value.status === 'TRADING' &&
      typeof value.baseAsset === 'string' &&
      value.isSpotTradingAllowed === true
    ) {
      assets.add(value.baseAsset.toUpperCase());
    }
  }

  return assets;
}

function getListedFuturesSymbols(payload: unknown): Map<string, string> {
  if (!isRecord(payload) || !Array.isArray(payload.symbols)) {
    throw new Error('Binance returned an unexpected futures market list response.');
  }

  const quotePriority: Record<string, number> = { USDT: 0, USDC: 1 };
  const pairsByAsset = new Map<string, Array<{ symbol: string; quoteAsset: string }>>();

  for (const value of payload.symbols) {
    if (
      !isRecord(value) ||
      value.status !== 'TRADING' ||
      typeof value.baseAsset !== 'string' ||
      typeof value.symbol !== 'string' ||
      typeof value.quoteAsset !== 'string'
    ) {
      continue;
    }

    const baseAsset = value.baseAsset.toUpperCase();
    const pairs = pairsByAsset.get(baseAsset) ?? [];
    pairs.push({ symbol: value.symbol, quoteAsset: value.quoteAsset.toUpperCase() });
    pairsByAsset.set(baseAsset, pairs);
  }

  const symbolsByAsset = new Map<string, string>();
  for (const [baseAsset, pairs] of pairsByAsset) {
    pairs.sort(
      (first, second) =>
        (quotePriority[first.quoteAsset] ?? 2) - (quotePriority[second.quoteAsset] ?? 2) ||
        first.symbol.localeCompare(second.symbol)
    );
    symbolsByAsset.set(baseAsset, pairs[0].symbol);
  }

  return symbolsByAsset;
}

export async function fetchBscAlphaTokens(signal?: AbortSignal): Promise<BscAlphaToken[]> {
  const [payload, spotPayload, futuresPayload, findCoinMarketCapSupply] = await Promise.all([
    fetchJson(TOKEN_LIST_ENDPOINT, signal),
    fetchJson(SPOT_MARKET_INFO_ENDPOINT, signal),
    fetchJson(FUTURES_MARKET_INFO_ENDPOINT, signal),
    fetchCoinMarketCapSupplyLookup(signal)
  ]);
  if (!isRecord(payload) || payload.code !== '000000' || !Array.isArray(payload.data)) {
    throw new Error('Binance returned an unexpected Alpha token list response.');
  }

  const spotAssets = getListedSpotAssets(spotPayload);
  const futuresSymbols = getListedFuturesSymbols(futuresPayload);

  const candidates = payload.data
    .map(parseAlphaTokenCandidate)
    .filter((token): token is AlphaTokenCandidate => token !== null)
    .flatMap((token) => {
      const baseAsset = token.symbol.toUpperCase();
      const futuresSymbol = futuresSymbols.get(baseAsset);
      if (!futuresSymbol || spotAssets.has(baseAsset)) {
        return [];
      }

      return [{ ...token, futuresSymbol }];
    });

  const futuresUnlockedPercents = await fetchFuturesUnlockedPercents(
    candidates.map((token) => token.symbol),
    signal
  );

  return candidates
    .flatMap((token): BscAlphaToken[] => {
      const coinMarketCapSupply = findCoinMarketCapSupply(token);
      const { circulatingSupply, totalSupply } = coinMarketCapSupply ?? token;
      const unlockedPercent =
        futuresUnlockedPercents.get(token.symbol.toUpperCase()) ??
        (coinMarketCapSupply ?? token).unlockedPercent;
      if (
        circulatingSupply === null ||
        totalSupply === null ||
        unlockedPercent === null ||
        unlockedPercent > MAX_UNLOCKED_PERCENT
      ) {
        return [];
      }

      return [
        {
          ...token,
          cmcSlug: coinMarketCapSupply?.slug ?? null,
          circulatingSupply,
          totalSupply,
          unlockedPercent
        }
      ];
    })
    .sort((first, second) => (second.marketCap ?? -1) - (first.marketCap ?? -1));
}
