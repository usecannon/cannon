import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import nodePolyfills from 'rollup-plugin-polyfill-node';

import pkg from './package.json' assert { type: 'json' };

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const basePlugins = [
  commonjs(), // so Rollup can convert deps to an ES module
  typescript({ tsconfig: 'tsconfig.build.json' }), // so Rollup can convert TypeScript to JavaScript
  json(), // so Rollup can import JSON files
];

export default [
  // ES6 bundle for Node.js usage
  {
    input: 'src/index.ts',
    plugins: [...basePlugins, nodeResolve({ preferBuiltins: true })],
    output: {
      name: 'cannon',
      file: pkg.module,
      format: 'esm',
      sourcemap: true,
    },
  },
  // Minified browser module
  {
    input: 'src/index.ts',
    plugins: [
      ...basePlugins,
      alias({
        entries: {
          'js-sha3': '@lumeweb/js-sha3-browser',
          'buffer-browserify': 'buffer',
        },
      }),
      nodePolyfills(),
      nodeResolve({
        browser: true,
        preferBuiltins: false,
      }),
      terser(),
    ],
    output: [
      {
        file: pkg.browser,
        format: 'umd',
        name: 'Cannon',
        sourcemap: true,
      },
    ],
  },
];
