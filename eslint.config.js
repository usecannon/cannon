import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import cypress from 'eslint-plugin-cypress';

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
      'packages/hardhat-cannon/dist/**',
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
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        global: 'readonly',
        exports: 'readonly',
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        WeakMap: 'readonly',
        WeakSet: 'readonly',
        Proxy: 'readonly',
        Reflect: 'readonly',
        Symbol: 'readonly',
        BigInt: 'readonly',
        // Test globals
        it: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        // Modern Node.js globals
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        fetch: 'readonly',
        performance: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        self: 'readonly',
        window: 'readonly',
        reject: 'readonly',
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
    files: ['packages/hardhat-cannon/**/*.ts', 'packages/repo/**/*.ts', 'packages/safe-app-backend/**/*.ts', 'examples/**/*.ts'],
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
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['packages/registry/test/**/*.ts'],
    languageOptions: {
      globals: {
        mocha: 'readonly',
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
        // Cypress
        cy: 'readonly',
        Cypress: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        WebSocket: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',
        self: 'readonly',
        Worker: 'readonly',
        MessageEvent: 'readonly',
        ErrorEvent: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
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
              message: 'Importing chains is not allowed. Please use `const {chains} = useCannonChains()` instead.',
            },
            {
              name: '@wagmi/core/chains',
              importNames: ['default'],
              message: 'Importing chains is not allowed. Please use `const {chains} = useCannonChains()` instead.',
            },
          ],
        },
      ],
    },
  },
];
