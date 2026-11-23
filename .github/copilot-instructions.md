# Project Instructions

- Organize UI components by Atomic Design under `src/components/atoms`, `molecules`, and
  `organisms`.
- Keep each component in its own directory with `index.tsx`, `index.scss`, and
  `index.stories.tsx`.
- Keep route pages under `src/pages`, with folder names matching their paths (`home` for `/`,
  `alpha-radar` for `/alpha-radar`, `chart` for `/chart/:symbol`, and `watchlist` for
  `/watchlist`). Pages do not need Storybook stories.
- Use the `@/` import alias for paths under `src`.
- Keep global reset and application shell styles in `src/app.scss`.
- Write styles in SCSS only. `src/app.tsx` and `.storybook/preview.tsx` eagerly load all
  `src/**/*.scss` files; do not import component styles manually.
- Use ABEM class names with an appropriate prefix (`a-`, `m-`, `o-`, `t-`, `p-`, `c-`, `u-`,
  `is-`, `has-`, or `js-`), followed by optional BEM elements and modifiers.
- Use the `p-` prefix for route page classes.
- Keep source filenames lowercase kebab-case.
- Add Storybook stories for reusable UI components and use the `autodocs` tag.
- Run only checks relevant to the change; prefer targeted validation over unrelated suites.
