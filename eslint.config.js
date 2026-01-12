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
    files: ['**/*.js', '**/*.config.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
    },
    rules: {
      'no-undef': 'off', // CommonJS files use global variables
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.nx/**', '**/coverage/**'],
  },
];
