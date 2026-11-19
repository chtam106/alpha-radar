# Crypto Desk

A React and TypeScript workspace scaffold for a cryptocurrency market dashboard.

## Project conventions

- Organize UI components under `src/components/atoms`, `molecules`, and `organisms`.
- Keep each component in its own directory with `index.tsx` and `index.scss`.
- Write styles in SCSS only. `src/main.tsx` eagerly loads all `src/**/*.scss` files, so do not
  import component styles manually.
- Use ABEM class names with an appropriate prefix (`a-`, `m-`, `o-`, `t-`, `p-`, `c-`, `u-`,
  `is-`, `has-`, or `js-`), followed by optional BEM elements and modifiers.
- Keep source filenames lowercase kebab-case.

## Development

```powershell
pnpm install
pnpm dev
```

## Validation

```powershell
pnpm check
pnpm build
```
