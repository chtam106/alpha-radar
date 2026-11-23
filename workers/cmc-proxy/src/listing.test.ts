import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCmcSupplyListing } from './listing';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('CoinMarketCap supply listing', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const listingEndpoint = 'cryptocurrency/listing';
  const unlockEndpoint = 'token-unlock/listing';

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  it('paginates unlock data and validates supply records', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.includes(unlockEndpoint)) {
        const page = Number(url.searchParams.get('start'));
        const coinsByPage: Record<number, unknown[]> = {
          1: [
            { cryptoId: 1, totalUnlockedPercentage: 25 },
            { cryptoId: 2, totalUnlockedPercentage: -3 }
          ],
          2: [{ cryptoId: 3, totalUnlockedPercentage: 120 }],
          3: [{ cryptoId: 4, totalUnlockedPercentage: 50 }]
        };
        return jsonResponse({
          data: { totalCount: 250, tokenUnlockList: coinsByPage[page] ?? [] }
        });
      }
      if (url.pathname.includes(listingEndpoint)) {
        expect(url.searchParams.get('limit')).toBe('10000');
        expect(url.searchParams.get('convert')).toBe('USD');
        return jsonResponse({
          data: {
            cryptoCurrencyList: [
              {
                id: 1,
                symbol: 'ONE',
                name: 'One',
                slug: 'one',
                circulatingSupply: 25,
                totalSupply: 100,
                platform: { token_address: '0xABC' }
              },
              {
                id: 2,
                symbol: 'TWO',
                name: 'Two',
                circulatingSupply: 0,
                selfReportedCirculatingSupply: 10,
                totalSupply: 20
              },
              {
                id: 3,
                symbol: 'THREE',
                name: 'Three',
                circulatingSupply: 50,
                totalSupply: 100
              },
              {
                id: 4,
                symbol: 'FOUR',
                name: 'Four',
                circulatingSupply: 1,
                totalSupply: 0
              },
              { id: 5, symbol: 'BAD', name: 'Bad', circulatingSupply: 1 },
              { symbol: 12, name: 'Malformed', circulatingSupply: 1, totalSupply: 2 }
            ]
          }
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(fetchCmcSupplyListing()).resolves.toEqual([
      {
        symbol: 'ONE',
        slug: 'one',
        name: 'One',
        tokenAddress: '0xabc',
        circulatingSupply: 25,
        totalSupply: 100,
        unlockedPercent: 25
      },
      {
        symbol: 'TWO',
        slug: null,
        name: 'Two',
        tokenAddress: null,
        circulatingSupply: 10,
        totalSupply: 20,
        unlockedPercent: 0
      },
      {
        symbol: 'THREE',
        slug: null,
        name: 'Three',
        tokenAddress: null,
        circulatingSupply: 50,
        totalSupply: 100,
        unlockedPercent: 100
      }
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('caps unlock pagination and still returns listings when unlock data is unavailable', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.includes(unlockEndpoint)) {
        if (url.searchParams.get('start') === '1') {
          return jsonResponse({ data: { totalCount: 100_000, tokenUnlockList: [] } });
        }
        throw new Error('Unlock service unavailable.');
      }
      if (url.pathname.includes(listingEndpoint)) {
        return jsonResponse({
          data: {
            cryptoCurrencyList: [
              { id: 1, symbol: 'ONE', name: 'One', circulatingSupply: 1, totalSupply: 10 }
            ]
          }
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(fetchCmcSupplyListing()).resolves.toMatchObject([
      { symbol: 'ONE', unlockedPercent: null }
    ]);
    const unlockRequests = fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.includes(unlockEndpoint));
    expect(unlockRequests).toHaveLength(30);
    expect(unlockRequests.map((url) => url.searchParams.get('start'))).toContain('30');
  });

  it('surfaces failed and malformed primary listing responses', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.includes(unlockEndpoint)) {
        return jsonResponse({ data: { totalCount: 0, tokenUnlockList: [] } });
      }
      return jsonResponse({ error: 'unavailable' }, 503);
    });
    await expect(fetchCmcSupplyListing()).rejects.toThrow('CoinMarketCap returned HTTP 503.');

    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.includes(unlockEndpoint)) {
        return jsonResponse({ data: { totalCount: 0, tokenUnlockList: [] } });
      }
      return jsonResponse({ data: { cryptoCurrencyList: {} } });
    });
    await expect(fetchCmcSupplyListing()).rejects.toThrow(
      'CoinMarketCap returned an unexpected listing response.'
    );
  });
});
