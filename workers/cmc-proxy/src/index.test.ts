import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchCmcSupplyListingMock } = vi.hoisted(() => ({
  fetchCmcSupplyListingMock: vi.fn()
}));

vi.mock('./listing.ts', () => ({
  fetchCmcSupplyListing: fetchCmcSupplyListingMock
}));

import worker from './index';

function createRequest(path: string, method = 'GET'): Request {
  return new Request(`https://worker.example${path}`, { method });
}

describe('CoinMarketCap proxy Worker', () => {
  const cache = {
    match: vi.fn<() => Promise<Response | undefined>>(),
    put: vi.fn<(key: Request, response: Response) => Promise<void>>()
  };
  const cachesMock = { open: vi.fn().mockResolvedValue(cache) };

  beforeEach(() => {
    cache.match.mockResolvedValue(undefined);
    cache.put.mockResolvedValue(undefined);
    cachesMock.open.mockResolvedValue(cache);
    vi.stubGlobal('caches', cachesMock);
    fetchCmcSupplyListingMock.mockResolvedValue([{ symbol: 'ONE' }]);
  });

  it('handles preflight, unsupported methods, and unknown routes explicitly', async () => {
    const options = await worker.fetch(createRequest('/cmc-listing', 'OPTIONS'));
    expect(options.status).toBe(204);
    expect(options.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(options.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');

    const post = await worker.fetch(createRequest('/cmc-listing', 'POST'));
    expect(post.status).toBe(405);
    expect(post.headers.get('Access-Control-Allow-Origin')).toBe('*');
    await expect(post.json()).resolves.toEqual({ error: 'Method not allowed' });

    const missing = await worker.fetch(createRequest('/missing'));
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: 'Not found' });
    expect(cachesMock.open).not.toHaveBeenCalled();
  });

  it('returns and caches successful listings with the configured TTL', async () => {
    const response = await worker.fetch(createRequest('/cmc-listing'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    await expect(response.json()).resolves.toEqual({ coins: [{ symbol: 'ONE' }] });
    expect(cache.put).toHaveBeenCalledTimes(1);

    const cachedResponse = new Response(JSON.stringify({ coins: [{ symbol: 'CACHED' }] }));
    cache.match.mockResolvedValueOnce(cachedResponse);
    const cached = await worker.fetch(createRequest('/cmc-listing'));
    await expect(cached.json()).resolves.toEqual({ coins: [{ symbol: 'CACHED' }] });
    expect(fetchCmcSupplyListingMock).toHaveBeenCalledTimes(1);
  });

  it('returns a visible upstream error and does not cache failed responses', async () => {
    fetchCmcSupplyListingMock.mockRejectedValueOnce(new Error('Upstream timed out.'));

    const response = await worker.fetch(createRequest('/cmc-listing'));

    expect(response.status).toBe(502);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    await expect(response.json()).resolves.toEqual({ error: 'Upstream timed out.' });
    expect(cache.put).not.toHaveBeenCalled();
  });
});
