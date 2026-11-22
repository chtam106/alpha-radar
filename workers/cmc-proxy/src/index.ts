import { fetchCmcSupplyListing } from './listing.ts';

const CACHE_TTL_SECONDS = 300;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: CORS_HEADERS });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return jsonError('Method not allowed', 405);
    }

    const url = new URL(request.url);
    if (url.pathname !== '/cmc-listing') {
      return jsonError('Not found', 404);
    }

    const cacheKey = new Request(`${url.origin}${url.pathname}`);
    const cache = await caches.open('cmc-listing');
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const coins = await fetchCmcSupplyListing();
      const response = Response.json(
        { coins },
        {
          headers: {
            ...CORS_HEADERS,
            'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`
          }
        }
      );
      await cache.put(cacheKey, response.clone());
      return response;
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : 'CoinMarketCap request failed.',
        502
      );
    }
  }
};
