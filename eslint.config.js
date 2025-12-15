import baseConfig from '@nx/eslint/plugin';

export default [
  ...baseConfig,
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.nx/**', '**/coverage/**'],
  },
];
