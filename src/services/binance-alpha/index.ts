import { fetchCoinMarketCapSupplyLookup } from '@/services/coinmarketcap';

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
  liquidity: number | null;
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

interface CurrentTokenMetrics extends BscAlphaTokenMetrics {
  price: number | null;
}

interface RawTokenSupply {
  circulatingSupply: number | null;
  totalSupply: number | null;
  unlockedPercent: number | null;
}

interface AlphaTokenCandidate {
  tokenId: string;
  name: string;
  symbol: string;
  contractAddress: string;
  liquidity: number | null;
  iconUrl: string | null;
  price: number | null;
  totalSupply: number | null;
  unlockedPercent: number | null;
}

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

function parseSupplyMetrics(value: Record<string, unknown>): RawTokenSupply {
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

function parseCurrentTokenMetrics(value: unknown): CurrentTokenMetrics | null {
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
    price: parseNumericValue(value.price),
    marketCap: null,
    fdv: null,
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

  const { totalSupply, unlockedPercent } = parseSupplyMetrics(value);

  return {
    tokenId,
    name,
    symbol,
    contractAddress,
    liquidity: parseNumericValue(value.liquidity),
    iconUrl: typeof value.iconUrl === 'string' ? value.iconUrl : null,
    price: parseNumericValue(value.price),
    totalSupply,
    unlockedPercent
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
  const [payload, findCoinMarketCapSupply] = await Promise.all([
    fetchJson(TOKEN_LIST_ENDPOINT, signal),
    fetchCoinMarketCapSupplyLookup(signal).catch(() => null)
  ]);
  if (!isRecord(payload) || payload.code !== '000000' || !Array.isArray(payload.data)) {
    throw new Error('Binance returned an unexpected Alpha token list response.');
  }

  const matches = payload.data
    .map(parseCurrentTokenMetrics)
    .filter((token): token is CurrentTokenMetrics => token !== null)
    .filter((token) => token.symbol === baseAsset);

  if (matches.length !== 1) {
    return null;
  }

  const [token] = matches;
  const cmcSupply =
    token.name && token.contractAddress
      ? (findCoinMarketCapSupply?.({
          symbol: token.symbol,
          name: token.name,
          contractAddress: token.contractAddress
        }) ?? null)
      : null;

  const { totalSupply, unlockedPercent } = cmcSupply ?? token;
  const circulatingSupply =
    totalSupply !== null && unlockedPercent !== null
      ? totalSupply * (unlockedPercent / 100)
      : token.circulatingSupply;
  const { price, ...metrics } = token;

  return {
    ...metrics,
    cmcSlug: cmcSupply?.slug ?? null,
    circulatingSupply,
    totalSupply,
    unlockedPercent,
    marketCap: price !== null && circulatingSupply !== null ? price * circulatingSupply : null,
    fdv: price !== null && totalSupply !== null ? price * totalSupply : null
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
      (value.quoteAsset !== 'USDT' && value.quoteAsset !== 'USDC')
    ) {
      continue;
    }

    const baseAsset = value.baseAsset.toUpperCase();
    const pairs = pairsByAsset.get(baseAsset) ?? [];
    pairs.push({ symbol: value.symbol, quoteAsset: value.quoteAsset });
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

  return candidates
    .flatMap((token): BscAlphaToken[] => {
      const coinMarketCapSupply = findCoinMarketCapSupply(token);
      const { totalSupply, unlockedPercent } = coinMarketCapSupply ?? token;
      if (
        totalSupply === null ||
        unlockedPercent === null ||
        unlockedPercent > MAX_UNLOCKED_PERCENT
      ) {
        return [];
      }

      const circulatingSupply = totalSupply * (unlockedPercent / 100);

      return [
        {
          tokenId: token.tokenId,
          name: token.name,
          symbol: token.symbol,
          futuresSymbol: token.futuresSymbol,
          contractAddress: token.contractAddress,
          liquidity: token.liquidity,
          cmcSlug: coinMarketCapSupply?.slug ?? null,
          iconUrl: token.iconUrl,
          price: token.price,
          circulatingSupply,
          totalSupply,
          unlockedPercent,
          marketCap: token.price !== null ? token.price * circulatingSupply : null,
          fdv: token.price !== null ? token.price * totalSupply : null
        }
      ];
    })
    .sort((first, second) => (second.marketCap ?? -1) - (first.marketCap ?? -1));
}
