import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import cypress from 'eslint-plugin-cypress';
import globals from 'globals';

export default [
  {
    ignores: [
      '.next/**',
      '.contentlayer/**',
      'coverage/**',
      'dist/**',
      'next.lock/**',
      'packages/website/next.lock/**',
      'node_modules/**',
      'packages/*/dist/**',
      'packages/contracts/lib/**',
      'packages/website/out/**',
      'packages/website/.contentlayer/**',
      'typechain-types/**',
      'typechain/**',
      '**/soljson-latest.js',
      'examples/**/typechain/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json'],
      },
      globals: {
        ...globals.node,
        ...globals.jest,
        reject: 'readonly', // used by legacy optimism e2e emitter scripts
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
        },
      ],
      'no-undef': 'error',
      'prefer-const': 'error',
      'no-console': ['error'],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(e|err|error)$',
        },
      ],
    },
    settings: {
      next: {
        rootDir: 'packages/website/',
      },
    },
  },
  {
    files: ['packages/{api,indexer}/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: [
      'packages/repo/**/*.ts',
      'packages/safe-app-backend/**/*.ts',
      'examples/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['packages/registry/test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
  {
    files: ['packages/website/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
      cypress: cypress,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        cy: 'readonly',
        Cypress: 'readonly',
      },
    },
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'viem/chains',
              importNames: ['default'],
              message:
                'Importing chains is not allowed. Please use `const {chains} = useCannonChains()` instead.',
            },
            {
              name: '@wagmi/core/chains',
              importNames: ['default'],
              message:
                'Importing chains is not allowed. Please use `const {chains} = useCannonChains()` instead.',
            },
          ],
        },
      ],
    },
  },
];
