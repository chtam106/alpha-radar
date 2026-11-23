import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as BinanceFuturesService from './index';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('Binance Futures service', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let service: typeof BinanceFuturesService;

  beforeEach(async () => {
    vi.stubGlobal('fetch', fetchMock);
    vi.resetModules();
    service = await import('./index');
  });

  it('parses direct and combined websocket candle and ticker messages safely', () => {
    const candle = service.parseBinanceFuturesKlineMessage(
      JSON.stringify({
        e: 'kline',
        k: { t: 1_700_000_000_000, o: '1', h: '3', l: '0.5', c: '2', v: '10' }
      })
    );
    expect(candle).toEqual({
      time: 1_700_000_000,
      open: 1,
      high: 3,
      low: 0.5,
      close: 2,
      volume: 10
    });
    expect(
      service.parseBinanceFuturesKlineMessage(
        JSON.stringify({
          stream: 'alphausdt@kline_1h',
          data: {
            e: 'kline',
            k: { t: 1000, o: '1', h: '2', l: '0.5', c: '1.5', v: '4' }
          }
        })
      )
    ).toMatchObject({ time: 1, close: 1.5 });
    expect(service.parseBinanceFuturesKlineMessage('{invalid')).toBeNull();
    expect(service.parseBinanceFuturesKlineMessage(JSON.stringify({ e: 'trade' }))).toBeNull();
    expect(
      service.parseBinanceFuturesKlineMessage(
        JSON.stringify({ e: 'kline', k: { t: -1, o: '1', h: '2', l: '1', c: '2', v: '3' } })
      )
    ).toBeNull();
    expect(
      service.parseBinanceFuturesTickerMessage(
        JSON.stringify({ stream: 'alphausdt@ticker', data: { e: '24hrTicker', c: '2.5' } })
      )
    ).toBe(2.5);
    expect(
      service.parseBinanceFuturesTickerMessage(JSON.stringify({ e: '24hrTicker', c: '0' }))
    ).toBeNull();
    expect(service.parseBinanceFuturesTickerMessage('{invalid')).toBeNull();
  });

  it('caches Futures metadata and selects perpetual symbol price formats', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        symbols: [
          {
            symbol: 'ALPHAUSDT',
            status: 'TRADING',
            contractType: 'PERPETUAL',
            quoteAsset: 'USDT',
            filters: [{ filterType: 'PRICE_FILTER', tickSize: '0.00100000' }]
          },
          {
            symbol: 'ALPHAUSDC',
            status: 'TRADING',
            contractType: 'PERPETUAL',
            quoteAsset: 'USDC',
            filters: [{ filterType: 'PRICE_FILTER', tickSize: '1e-8' }]
          },
          {
            symbol: 'DELISTED',
            status: 'BREAK',
            contractType: 'PERPETUAL',
            quoteAsset: 'USDT',
            filters: [{ filterType: 'PRICE_FILTER', tickSize: '0.01' }]
          },
          {
            symbol: 'NOFILTER',
            status: 'TRADING',
            contractType: 'PERPETUAL',
            quoteAsset: 'USDT',
            filters: []
          }
        ]
      })
    );

    await expect(service.fetchBinanceFuturesSymbols()).resolves.toEqual(['ALPHAUSDC', 'ALPHAUSDT']);
    await expect(service.fetchBinanceFuturesPriceFormat('alphausdt')).resolves.toEqual({
      precision: 3,
      minMove: 0.001
    });
    await expect(service.fetchBinanceFuturesPriceFormat('ALPHAUSDC')).resolves.toEqual({
      precision: 8,
      minMove: 1e-8
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears a failed metadata cache so a later request can recover', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ symbols: [] }));

    await expect(service.fetchBinanceFuturesSymbols()).rejects.toThrow(
      'Binance Futures exchange info returned HTTP 503.'
    );
    await expect(service.fetchBinanceFuturesSymbols()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('validates symbols, ticker payloads, and candle API responses', async () => {
    await expect(service.fetchBinanceFuturesPriceFormat('bad/symbol')).rejects.toThrow(
      'Invalid Futures symbol.'
    );
    await expect(service.fetchBinanceFuturesLastPrice('bad/symbol')).rejects.toThrow(
      'Invalid Futures symbol.'
    );
    await expect(service.fetchBinanceFuturesCandles('bad/symbol', '1h')).rejects.toThrow(
      'Invalid Futures symbol.'
    );
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(jsonResponse({ symbol: 'OTHERUSDT', price: '1' }));
    await expect(service.fetchBinanceFuturesLastPrice('ALPHAUSDT')).rejects.toThrow(
      'Binance returned an unexpected Futures ticker response.'
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ symbol: 'ALPHAUSDT', price: '0' }));
    await expect(service.fetchBinanceFuturesLastPrice('ALPHAUSDT')).rejects.toThrow(
      'Binance returned an invalid Futures price for ALPHAUSDT.'
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ invalid: true }));
    await expect(service.fetchBinanceFuturesCandles('ALPHAUSDT', '1h')).rejects.toThrow(
      'Binance returned an unexpected Futures candle response.'
    );
    fetchMock.mockResolvedValueOnce(jsonResponse([['bad']]));
    await expect(service.fetchBinanceFuturesCandles('ALPHAUSDT', '1h')).rejects.toThrow(
      'No Futures candle data found for ALPHAUSDT.'
    );
  });

  it('parses candle data and returns the last candle', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse([
        [1000, '1', '3', '0.5', '2', '4'],
        [2000, '2', '4', '1', '3', '8'],
        ['invalid', 'bad', 'bad', 'bad', 'bad', 'bad']
      ])
    );

    await expect(service.fetchBinanceFuturesCandles('ALPHAUSDT', '1h')).resolves.toEqual([
      { time: 1, open: 1, high: 3, low: 0.5, close: 2, volume: 4 },
      { time: 2, open: 2, high: 4, low: 1, close: 3, volume: 8 }
    ]);
    await expect(service.fetchBinanceFuturesLatestCandle('ALPHAUSDT', '1h')).resolves.toMatchObject(
      { time: 2, close: 3 }
    );
  });

  it('paginates all-time candles, finds extrema, and rejects non-advancing pages', async () => {
    const fullPage = Array.from({ length: 1500 }, (_, index) => [
      index * 86_400_000,
      '10',
      String(100 + index),
      String(5 + index),
      '50',
      '100'
    ]);
    fetchMock.mockResolvedValueOnce(jsonResponse(fullPage)).mockResolvedValueOnce(jsonResponse([]));

    await expect(service.fetchBinanceFuturesAllTimeExtremes('ALPHAUSDT')).resolves.toEqual({
      ath: { price: 1599, time: 1499 * 86_400 },
      atl: { price: 5, time: 0 }
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('startTime=129513601000');

    vi.resetModules();
    service = await import('./index');
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => jsonResponse(fullPage));
    await expect(service.fetchBinanceFuturesAllTimeExtremes('ALPHAUSDT')).rejects.toThrow(
      'Binance Futures returned a non-advancing history page for ALPHAUSDT.'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
