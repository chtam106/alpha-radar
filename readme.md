# Alpha Radar

A React and TypeScript dashboard for researching Binance Alpha tokens.

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

## Feature flags

The Futures chart is temporarily disabled by `ENABLE_CHART_PAGE` in
[src/config/feature-flags.ts](./src/config/feature-flags.ts). Set it to `true` to restore the chart
route and context-menu action together.

## Validation

```powershell
pnpm check
pnpm build
```

## Tests

```powershell
pnpm test
pnpm run test:coverage
```

`pnpm test` runs the full suite without contacting live APIs; API and Worker dependencies are
mocked. Use a file path to run one suite, for example:

```powershell
pnpm test -- src/services/binance-alpha/index.test.ts
```

`pnpm run test:coverage` prints a summary and writes the HTML report to `coverage/index.html`.
Open it in a browser to inspect coverage by file and line. The LCOV report is written to
`coverage/lcov.info`. CI requires at least 80% statement, line, and function coverage and 70%
branch coverage. Coverage thresholds are enforced by `pnpm check` and the GitHub Actions `Tests`
job. Tests cover service parsing and API failures, the CMC proxy Worker, watchlist persistence,
routing, and interactive Home, Watchlist, and Chart flows.

GitHub Actions also runs TypeScript, ESLint, Stylelint, and Prettier checks for pull requests
targeting `master`.
