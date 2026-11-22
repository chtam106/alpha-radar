# Crypto Desk

A React and TypeScript workspace scaffold for a cryptocurrency market dashboard.

See [.github/copilot-instructions.md](./.github/copilot-instructions.md) for project conventions.

## Development

```powershell
pnpm install
pnpm dev
```

## CoinMarketCap supply proxy

The Alpha Radar reads circulating and total supply from the CoinMarketCap web listing API, which
does not allow cross-origin browser requests. `pnpm dev` serves it through a Vite middleware.
Production builds need the Cloudflare Worker in `workers/cmc-proxy`:

```powershell
cd workers/cmc-proxy
npx wrangler login
npx wrangler deploy
```

Set the repository variable `CMC_LISTING_URL` (Settings → Secrets and variables → Actions →
Variables) to `https://<worker>.workers.dev/cmc-listing`. Locally, set `VITE_CMC_LISTING_URL` in
`.env.local` to use the Worker instead of the Vite middleware.

## Storybook

```powershell
pnpm storybook
```

## Validation

```powershell
pnpm check
pnpm build
```

GitHub Actions runs independent TypeScript, ESLint, Stylelint, and Prettier checks for pull
requests targeting `master`, only when relevant files change.
