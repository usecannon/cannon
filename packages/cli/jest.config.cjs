module.exports = {
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    // commander@15 / untildify@6 are ESM-only; compile their ESM output to CJS for jest 29
    'node_modules/(commander|untildify)/.*\\.js$': [
      'ts-jest',
      { tsconfig: { allowJs: true, module: 'CommonJS', moduleResolution: 'bundler' } },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!.*(commander|untildify))'],
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    // repo uses node16-style `.js`-suffixed relative imports; map them back for jest-resolve
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // lodash-es is ESM-only; jest 29 CJS mode uses lodash instead
    '^lodash-es$': 'lodash/lodash.js',
    // @usecannon/builder is ESM-only after the ESM migration; run its TS source through ts-jest
    '^@usecannon/builder$': '<rootDir>/../builder/src/index.ts',
    '^@usecannon/builder/dist/src/(.*)\\.js$': '<rootDir>/../builder/src/$1',
    '^@usecannon/builder/dist/src/(.*)$': '<rootDir>/../builder/src/$1',
    // fs-extra/esm subpath is ESM-only; use the equivalent CJS entry instead
    '^fs-extra/esm$': 'fs-extra',
  },
  globals: {
    'ts-jest': {
      // emit CJS regardless of the ESM package type (jest 29 runs CJS)
      tsconfig: { module: 'CommonJS', moduleResolution: 'bundler' },
    },
  },
};
