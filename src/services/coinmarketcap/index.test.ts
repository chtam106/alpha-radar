import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCoinMarketCapSupplyLookup, getCoinMarketCapUrl } from './index';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('CoinMarketCap utilities', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  it('prefers a known slug, then contract address, then a normalized name', () => {
    expect(
      getCoinMarketCapUrl({
        cmcSlug: 'known token',
        contractAddress: '0xAbC',
        name: 'Known Token',
        symbol: 'KNT'
      })
    ).toBe('https://coinmarketcap.com/currencies/known%20token/');
    expect(
      getCoinMarketCapUrl({
        cmcSlug: null,
        contractAddress: '0xAbC/1',
        name: null,
        symbol: 'KNT'
      })
    ).toBe('https://dex.coinmarketcap.com/token/bsc/0xAbC%2F1/');
    expect(
      getCoinMarketCapUrl({
        cmcSlug: null,
        contractAddress: null,
        name: '  Very / Odd Token  ',
        symbol: 'VOT'
      })
    ).toBe('https://coinmarketcap.com/currencies/very-odd-token/');
  });

  it('matches supply by address first and resolves ambiguous symbols by name', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        coins: [
          {
            symbol: 'DUP',
            name: 'First Coin',
            slug: 'first-coin',
            tokenAddress: '0xABC',
            circulatingSupply: 20,
            totalSupply: 100,
            unlockedPercent: 20
          },
          {
            symbol: 'DUP',
            name: 'Second Coin',
            slug: 'second-coin',
            tokenAddress: '0xdef',
            circulatingSupply: 40,
            totalSupply: 100,
            unlockedPercent: 40
          },
          {
            symbol: 'ONE',
            name: 'Only One',
            slug: 'only-one',
            circulatingSupply: 10,
            totalSupply: 50
          }
        ]
      })
    );

    const findSupply = await fetchCoinMarketCapSupplyLookup();

    expect(findSupply({ symbol: 'DUP', name: 'wrong name', contractAddress: '0xabc' })).toEqual({
      slug: 'first-coin',
      circulatingSupply: 20,
      totalSupply: 100,
      unlockedPercent: 20
    });
    expect(
      findSupply({ symbol: 'DUP', name: 'second coin', contractAddress: 'unknown' })?.slug
    ).toBe('second-coin');
    expect(findSupply({ symbol: 'DUP', name: 'unknown', contractAddress: '' })).toBeNull();
    expect(
      findSupply({ symbol: 'ONE', name: 'different name', contractAddress: '' })?.unlockedPercent
    ).toBe(20);
  });

  it('ignores malformed and impossible supply records', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        coins: [
          {
            symbol: 'NEG',
            name: 'Negative',
            circulatingSupply: -1,
            totalSupply: 10
          },
          {
            symbol: 'OVER',
            name: 'Over Supply',
            circulatingSupply: 11,
            totalSupply: 10
          },
          {
            symbol: 'NAN',
            name: 'Not Finite',
            circulatingSupply: Number.NaN,
            totalSupply: 10
          },
          { symbol: 12, name: 'Malformed', circulatingSupply: 1, totalSupply: 2 },
          {
            symbol: 'BADP',
            name: 'Bad Percent',
            circulatingSupply: 1,
            totalSupply: 10,
            unlockedPercent: 101
          }
        ]
      })
    );

    const findSupply = await fetchCoinMarketCapSupplyLookup();

    expect(findSupply({ symbol: 'NEG', name: 'Negative', contractAddress: '' })).toBeNull();
    expect(findSupply({ symbol: 'OVER', name: 'Over Supply', contractAddress: '' })).toBeNull();
    expect(findSupply({ symbol: 'NAN', name: 'Not Finite', contractAddress: '' })).toBeNull();
    expect(findSupply({ symbol: 'BADP', name: 'Bad Percent', contractAddress: '' })).toBeNull();
  });

  it('rejects failed and unexpected proxy responses', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 502));
    await expect(fetchCoinMarketCapSupplyLookup()).rejects.toThrow(
      'CoinMarketCap listing proxy returned HTTP 502.'
    );

    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await expect(fetchCoinMarketCapSupplyLookup()).rejects.toThrow(
      'CoinMarketCap listing proxy returned an unexpected response.'
    );
  });
});
