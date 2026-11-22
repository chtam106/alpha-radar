import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { fetchCmcSupplyListing } from './workers/cmc-proxy/src/listing.ts';

const repositoryName = 'crypto';

function cmcListingDevProxy(): Plugin {
  return {
    name: 'cmc-listing-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/cmc-listing', (_request, response) => {
        response.setHeader('Content-Type', 'application/json');
        fetchCmcSupplyListing()
          .then((coins) => response.end(JSON.stringify({ coins })))
          .catch((error: unknown) => {
            response.statusCode = 502;
            response.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : 'CoinMarketCap request failed.'
              })
            );
          });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? `/${repositoryName}/` : '/',
  plugins: [react(), cmcListingDevProxy()],
  server: {
    open: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
