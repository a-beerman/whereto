import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.base.json'],
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      // Keep rules minimal; Nx-specific rules can be reintroduced once plugin config is resolved
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.nx/**', '**/coverage/**'],
  },
];
