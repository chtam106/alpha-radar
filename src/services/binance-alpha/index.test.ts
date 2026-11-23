import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBscAlphaTokenMetrics, fetchBscAlphaTokens } from './index';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function token(
  tokenId: string,
  symbol: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    tokenId,
    name: `${symbol} Token`,
    symbol,
    contractAddress: `0x${tokenId}`,
    chainId: 56,
    liquidity: '1234567.89',
    totalSupply: '1000',
    circulatingSupply: '200',
    price: '2',
    ...overrides
  };
}

describe('Binance Alpha token service', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const alphaEndpoint = 'wallet/cex/alpha/all/token/list';
  const spotEndpoint = 'api/v3/exchangeInfo';
  const futuresEndpoint = 'fapi/v1/exchangeInfo';

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  it('filters to eligible BSC Futures-only tokens and calculates metrics', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(alphaEndpoint)) {
        return jsonResponse({
          code: '000000',
          data: [
            token('alpha', 'ALPHA'),
            token('edge', 'EDGE', { liquidity: 'invalid', circulatingSupply: '350' }),
            token('high', 'HIGH', { circulatingSupply: '360' }),
            token('spot', 'SPOT'),
            token('no-futures', 'NOFUT'),
            token('offline', 'OFFLINE', { offline: true }),
            token('delisted', 'DELISTED', { fullyDelisted: true }),
            token('wrong-chain', 'WRONG', { chainId: 97 }),
            token('bad-supply', 'BAD', { totalSupply: 0 }),
            { ...token('invalid', 'INVALID'), tokenId: undefined }
          ]
        });
      }
      if (url.includes(spotEndpoint)) {
        return jsonResponse({
          symbols: [
            { status: 'TRADING', baseAsset: 'SPOT', isSpotTradingAllowed: true },
            { status: 'BREAK', baseAsset: 'EDGE', isSpotTradingAllowed: true },
            { status: 'TRADING', baseAsset: 'ALPHA', isSpotTradingAllowed: false }
          ]
        });
      }
      if (url.includes(futuresEndpoint)) {
        return jsonResponse({
          symbols: [
            { status: 'TRADING', baseAsset: 'ALPHA', quoteAsset: 'USDC', symbol: 'ALPHAUSDC' },
            { status: 'TRADING', baseAsset: 'ALPHA', quoteAsset: 'USDT', symbol: 'ALPHAUSDT' },
            { status: 'TRADING', baseAsset: 'EDGE', quoteAsset: 'USDT', symbol: 'EDGEUSDT' },
            { status: 'TRADING', baseAsset: 'HIGH', quoteAsset: 'USDT', symbol: 'HIGHUSDT' },
            { status: 'TRADING', baseAsset: 'SPOT', quoteAsset: 'USDT', symbol: 'SPOTUSDT' },
            { status: 'BREAK', baseAsset: 'NOFUT', quoteAsset: 'USDT', symbol: 'NOFUTUSDT' },
            { status: 'TRADING', baseAsset: 'NOFUT', quoteAsset: 'BUSD', symbol: 'NOFUTBUSD' }
          ]
        });
      }
      if (url.includes('cmc-listing')) {
        return jsonResponse({
          coins: [
            {
              symbol: 'ALPHA',
              name: 'Alpha Token',
              slug: 'alpha-token',
              tokenAddress: '0xalpha',
              circulatingSupply: 400,
              totalSupply: 2000,
              unlockedPercent: 20
            },
            {
              symbol: 'HIGH',
              name: 'HIGH Token',
              tokenAddress: '0xhigh',
              circulatingSupply: 360,
              totalSupply: 1000,
              unlockedPercent: 36
            }
          ]
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const controller = new AbortController();
    const tokens = await fetchBscAlphaTokens(controller.signal);

    expect(tokens.map(({ futuresSymbol }) => futuresSymbol)).toEqual(['ALPHAUSDT', 'EDGEUSDT']);
    expect(tokens[0]).toMatchObject({
      tokenId: 'alpha',
      liquidity: 1234567.89,
      cmcSlug: 'alpha-token',
      totalSupply: 2000,
      circulatingSupply: 400,
      unlockedPercent: 20,
      marketCap: 800,
      fdv: 4000
    });
    expect(tokens[1]).toMatchObject({
      tokenId: 'edge',
      liquidity: null,
      totalSupply: 1000,
      circulatingSupply: 350,
      unlockedPercent: 35,
      marketCap: 700,
      fdv: 2000
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options?.signal).toBe(controller.signal);
    }
  });

  it('rejects invalid Futures symbols before making requests', async () => {
    await expect(fetchBscAlphaTokenMetrics('../ALPHAUSDT')).rejects.toThrow(
      'Invalid Futures symbol.'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the current Alpha list has no unique symbol match', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(alphaEndpoint)) {
        return jsonResponse({
          code: '000000',
          data: [token('one', 'ALPHA'), token('two', 'ALPHA')]
        });
      }
      if (url.includes('cmc-listing')) {
        return jsonResponse({ coins: [] });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(fetchBscAlphaTokenMetrics('ALPHAUSDT')).resolves.toBeNull();
  });

  it('uses the exact current token and reports malformed API responses', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(alphaEndpoint)) {
        return jsonResponse({
          code: '000000',
          data: [token('alpha', 'ALPHA', { price: '3', circulatingSupply: '100' })]
        });
      }
      if (url.includes('cmc-listing')) {
        return jsonResponse({
          coins: [
            {
              symbol: 'ALPHA',
              name: 'ALPHA Token',
              slug: 'alpha-token',
              tokenAddress: '0xalpha',
              circulatingSupply: 500,
              totalSupply: 2000,
              unlockedPercent: 25
            }
          ]
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(fetchBscAlphaTokenMetrics('alphausdt')).resolves.toMatchObject({
      symbol: 'ALPHA',
      cmcSlug: 'alpha-token',
      totalSupply: 2000,
      circulatingSupply: 500,
      unlockedPercent: 25,
      marketCap: 1500,
      fdv: 6000
    });

    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(alphaEndpoint)) {
        return jsonResponse({ code: 'bad', data: [] });
      }
      if (url.includes('cmc-listing')) {
        return jsonResponse({ coins: [] });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    await expect(fetchBscAlphaTokenMetrics('ALPHAUSDT')).rejects.toThrow(
      'Binance returned an unexpected Alpha token list response.'
    );
  });

  it('surfaces upstream HTTP and unexpected market-list failures', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(alphaEndpoint)) {
        return jsonResponse({ code: '000000', data: [] });
      }
      if (url.includes(spotEndpoint)) {
        return jsonResponse({ message: 'unavailable' }, 503);
      }
      if (url.includes(futuresEndpoint)) {
        return jsonResponse({ symbols: [] });
      }
      if (url.includes('cmc-listing')) {
        return jsonResponse({ coins: [] });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    await expect(fetchBscAlphaTokens()).rejects.toThrow('Binance API returned HTTP 503.');

    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(alphaEndpoint)) {
        return jsonResponse({ code: '000000', data: [] });
      }
      if (url.includes(spotEndpoint)) {
        return jsonResponse({ invalid: true });
      }
      if (url.includes(futuresEndpoint)) {
        return jsonResponse({ symbols: [] });
      }
      if (url.includes('cmc-listing')) {
        return jsonResponse({ coins: [] });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    await expect(fetchBscAlphaTokens()).rejects.toThrow(
      'Binance returned an unexpected spot market list response.'
    );
  });
});
