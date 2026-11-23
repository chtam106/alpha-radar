import type { UTCTimestamp } from 'lightweight-charts';

const FUTURES_KLINES_ENDPOINT = 'https://fapi.binance.com/fapi/v1/klines';
const FUTURES_EXCHANGE_INFO_ENDPOINT = 'https://fapi.binance.com/fapi/v1/exchangeInfo';
const FUTURES_TICKER_PRICE_ENDPOINT = 'https://fapi.binance.com/fapi/v1/ticker/price';
const MAX_CANDLES = 500;
const MAX_HISTORICAL_CANDLES_PER_REQUEST = 1500;

export type BinanceFuturesInterval = '15m' | '1h' | '4h' | '1d' | '1w' | '1M';

export interface BinanceFuturesCandle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BinanceFuturesPriceFormat {
  precision: number;
  minMove: number;
}

export interface BinanceFuturesPriceExtreme {
  price: number;
  time: UTCTimestamp;
}

export interface BinanceFuturesPriceExtremes {
  ath: BinanceFuturesPriceExtreme;
  atl: BinanceFuturesPriceExtreme;
}

interface BinanceFuturesExchangeInfo {
  priceFormats: Map<string, BinanceFuturesPriceFormat>;
  perpetualSymbols: string[];
}

let futuresExchangeInfoPromise: Promise<BinanceFuturesExchangeInfo> | null = null;

function parseNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseCandle(value: unknown): BinanceFuturesCandle | null {
  if (!Array.isArray(value) || value.length < 6) {
    return null;
  }

  const openTime = parseNumber(value[0]);
  const open = parseNumber(value[1]);
  const high = parseNumber(value[2]);
  const low = parseNumber(value[3]);
  const close = parseNumber(value[4]);
  const volume = parseNumber(value[5]);

  if (
    openTime === null ||
    openTime < 0 ||
    open === null ||
    high === null ||
    low === null ||
    close === null ||
    volume === null
  ) {
    return null;
  }

  return {
    time: Math.floor(openTime / 1000) as UTCTimestamp,
    open,
    high,
    low,
    close,
    volume
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseBinanceFuturesKlineMessage(message: string): BinanceFuturesCandle | null {
  const parsedPayload = parseWebSocketMessage(message);
  const payload = unwrapCombinedStreamPayload(parsedPayload);

  if (!isRecord(payload) || payload.e !== 'kline' || !isRecord(payload.k)) {
    return null;
  }

  const kline = payload.k;
  return parseCandle([kline.t, kline.o, kline.h, kline.l, kline.c, kline.v]);
}

export function parseBinanceFuturesTickerMessage(message: string): number | null {
  const payload = unwrapCombinedStreamPayload(parseWebSocketMessage(message));
  if (!isRecord(payload) || payload.e !== '24hrTicker') {
    return null;
  }

  const price = parseNumber(payload.c);
  return price !== null && price > 0 ? price : null;
}

function parseWebSocketMessage(message: string): unknown {
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
}

function unwrapCombinedStreamPayload(payload: unknown): unknown {
  return isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
}

function getPricePrecision(tickSize: string): number {
  const exponent = tickSize.toLowerCase().match(/e-(\d+)$/);
  if (exponent) {
    return Number(exponent[1]);
  }

  const fraction = tickSize.split('.')[1] ?? '';
  return fraction.replace(/0+$/, '').length;
}

async function loadBinanceFuturesExchangeInfo(): Promise<BinanceFuturesExchangeInfo> {
  const response = await fetch(FUTURES_EXCHANGE_INFO_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Binance Futures exchange info returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.symbols)) {
    throw new Error('Binance returned an unexpected Futures exchange info response.');
  }

  const priceFormats = new Map<string, BinanceFuturesPriceFormat>();
  const perpetualSymbols: string[] = [];
  for (const value of payload.symbols) {
    if (!isRecord(value) || typeof value.symbol !== 'string' || !Array.isArray(value.filters)) {
      continue;
    }

    const priceFilter = value.filters.find(
      (filter) => isRecord(filter) && filter.filterType === 'PRICE_FILTER'
    );
    if (!isRecord(priceFilter) || typeof priceFilter.tickSize !== 'string') {
      continue;
    }

    const minMove = parseNumber(priceFilter.tickSize);
    if (minMove === null || minMove <= 0) {
      continue;
    }

    priceFormats.set(value.symbol.toUpperCase(), {
      precision: getPricePrecision(priceFilter.tickSize),
      minMove
    });
    if (
      value.status === 'TRADING' &&
      value.contractType === 'PERPETUAL' &&
      (value.quoteAsset === 'USDT' || value.quoteAsset === 'USDC')
    ) {
      perpetualSymbols.push(value.symbol.toUpperCase());
    }
  }

  return { priceFormats, perpetualSymbols: perpetualSymbols.sort() };
}

function getBinanceFuturesExchangeInfo(): Promise<BinanceFuturesExchangeInfo> {
  if (!futuresExchangeInfoPromise) {
    futuresExchangeInfoPromise = loadBinanceFuturesExchangeInfo().catch((error: unknown) => {
      futuresExchangeInfoPromise = null;
      throw error;
    });
  }

  return futuresExchangeInfoPromise;
}

export async function fetchBinanceFuturesSymbols(): Promise<string[]> {
  const { perpetualSymbols } = await getBinanceFuturesExchangeInfo();
  return perpetualSymbols;
}

export async function fetchBinanceFuturesPriceFormat(
  symbol: string
): Promise<BinanceFuturesPriceFormat> {
  const normalizedSymbol = symbol.toUpperCase();
  if (!/^[A-Z0-9]{2,30}$/.test(normalizedSymbol)) {
    throw new Error('Invalid Futures symbol.');
  }

  const { priceFormats: formats } = await getBinanceFuturesExchangeInfo();
  const priceFormat = formats.get(normalizedSymbol);
  if (!priceFormat) {
    throw new Error(`Binance Futures has no price filter for ${normalizedSymbol}.`);
  }

  return priceFormat;
}

export async function fetchBinanceFuturesLastPrice(
  symbol: string,
  signal?: AbortSignal
): Promise<number> {
  const normalizedSymbol = symbol.toUpperCase();
  if (!/^[A-Z0-9]{2,30}$/.test(normalizedSymbol)) {
    throw new Error('Invalid Futures symbol.');
  }

  const query = new URLSearchParams({ symbol: normalizedSymbol });
  const response = await fetch(`${FUTURES_TICKER_PRICE_ENDPOINT}?${query}`, { signal });
  if (!response.ok) {
    throw new Error(
      `Binance Futures ticker returned HTTP ${response.status} for ${normalizedSymbol}.`
    );
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || payload.symbol !== normalizedSymbol) {
    throw new Error('Binance returned an unexpected Futures ticker response.');
  }

  const price = parseNumber(payload.price);
  if (price === null || price <= 0) {
    throw new Error(`Binance returned an invalid Futures price for ${normalizedSymbol}.`);
  }

  return price;
}

async function fetchFuturesCandles(
  symbol: string,
  interval: BinanceFuturesInterval,
  limit: number,
  signal?: AbortSignal,
  startTime?: number,
  allowEmpty = false
): Promise<BinanceFuturesCandle[]> {
  const normalizedSymbol = symbol.toUpperCase();
  if (!/^[A-Z0-9]{2,30}$/.test(normalizedSymbol)) {
    throw new Error('Invalid Futures symbol.');
  }

  const query = new URLSearchParams({
    symbol: normalizedSymbol,
    interval,
    limit: String(limit)
  });
  if (startTime !== undefined) {
    query.set('startTime', String(startTime));
  }

  const response = await fetch(`${FUTURES_KLINES_ENDPOINT}?${query}`, { signal });
  if (!response.ok) {
    throw new Error(
      `Binance Futures API returned HTTP ${response.status} for ${normalizedSymbol}.`
    );
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Binance returned an unexpected Futures candle response.');
  }

  const candles = payload
    .map(parseCandle)
    .filter((candle): candle is BinanceFuturesCandle => candle !== null);
  if (candles.length === 0) {
    if (allowEmpty) {
      return [];
    }
    throw new Error(`No Futures candle data found for ${normalizedSymbol}.`);
  }

  return candles;
}

export function fetchBinanceFuturesCandles(
  symbol: string,
  interval: BinanceFuturesInterval,
  signal?: AbortSignal
): Promise<BinanceFuturesCandle[]> {
  return fetchFuturesCandles(symbol, interval, MAX_CANDLES, signal);
}

export async function fetchBinanceFuturesLatestCandle(
  symbol: string,
  interval: BinanceFuturesInterval,
  signal?: AbortSignal
): Promise<BinanceFuturesCandle> {
  const candles = await fetchFuturesCandles(symbol, interval, 1, signal);
  return candles[candles.length - 1];
}

export async function fetchBinanceFuturesAllTimeExtremes(
  symbol: string,
  signal?: AbortSignal
): Promise<BinanceFuturesPriceExtremes | null> {
  let startTime = 0;
  let ath: BinanceFuturesPriceExtreme | null = null;
  let atl: BinanceFuturesPriceExtreme | null = null;

  while (true) {
    const candles = await fetchFuturesCandles(
      symbol,
      '1d',
      MAX_HISTORICAL_CANDLES_PER_REQUEST,
      signal,
      startTime,
      true
    );

    if (candles.length === 0) {
      break;
    }

    for (const candle of candles) {
      if (!ath || candle.high > ath.price) {
        ath = { price: candle.high, time: candle.time };
      }
      if (!atl || candle.low < atl.price) {
        atl = { price: candle.low, time: candle.time };
      }
    }

    if (candles.length < MAX_HISTORICAL_CANDLES_PER_REQUEST) {
      break;
    }

    const nextStartTime = (Number(candles[candles.length - 1].time) + 1) * 1000;
    if (nextStartTime <= startTime) {
      throw new Error(`Binance Futures returned a non-advancing history page for ${symbol}.`);
    }
    startTime = nextStartTime;
  }

  if (!ath || !atl) {
    return null;
  }

  return { ath, atl };
}
