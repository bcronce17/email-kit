import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**', '.previews/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{ts,mjs,js}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-unused-vars': 'off',
      curly: ['error', 'all']
    }
  },
  {
    files: ['tests/browser/**/*.mjs'],
    languageOptions: { globals: globals.browser }
  }
);
