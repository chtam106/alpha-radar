import { FUTURES_TOKEN_SYMBOL_PATTERN, fetchFuturesTokenSupply } from './futures-token-info.ts';
import { fetchCmcSupplyListing } from './listing.ts';

const CACHE_TTL_SECONDS = 300;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

interface Route {
  cacheKey: string;
  load: () => Promise<unknown>;
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: CORS_HEADERS });
}

function resolveRoute(url: URL): Route | Response {
  if (url.pathname === '/cmc-listing') {
    return {
      cacheKey: `${url.origin}${url.pathname}`,
      load: async () => ({ coins: await fetchCmcSupplyListing() })
    };
  }

  if (url.pathname === '/futures-token-info') {
    const symbol = url.searchParams.get('symbol')?.toUpperCase() ?? '';
    if (!FUTURES_TOKEN_SYMBOL_PATTERN.test(symbol)) {
      return jsonError('Invalid symbol', 400);
    }

    return {
      cacheKey: `${url.origin}${url.pathname}?symbol=${symbol}`,
      load: async () => ({ token: await fetchFuturesTokenSupply(symbol) })
    };
  }

  return jsonError('Not found', 404);
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return jsonError('Method not allowed', 405);
    }

    const route = resolveRoute(new URL(request.url));
    if (route instanceof Response) {
      return route;
    }

    const cacheKey = new Request(route.cacheKey);
    const cache = await caches.open('cmc-proxy');
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const response = Response.json(await route.load(), {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`
        }
      });
      await cache.put(cacheKey, response.clone());
      return response;
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : 'Upstream request failed.', 502);
    }
  }
};
