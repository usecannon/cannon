import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';

import pkg from './package.json' assert { type: 'json' };

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  // Minified browser module
  {
    input: 'src/index.ts',
    plugins: [
      commonjs(),
      typescript({ tsconfig: 'tsconfig.build.json' }),
      json(),
      alias({
        entries: {
          'js-sha3': '@lumeweb/js-sha3-browser',
        },
      }),
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
