/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: ['dist/**', 'node_modules/**'],
  rules: {
    'selector-class-pattern': [
      '^(?:a|m|o|t|p|c|u|is|has|js)-[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?(?:--[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?$',
      {
        message:
          'Expected class selectors to follow ABEM: a-, m-, o-, t-, p-, c-, u-, is-, has-, or js- prefix with optional BEM element and modifier.',
        resolveNestedSelectors: true
      }
    ]
  }
};
