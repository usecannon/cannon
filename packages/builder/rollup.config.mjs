import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  // Minified browser module
  {
    input: 'dist/src/index.js',
    plugins: [
      commonjs(),
      json(),
      nodeResolve({
        browser: true,
        preferBuiltins: false,
      }),
      terser(),
    ],
    output: [
      {
        dir: 'dist/cannon.esm',
        format: 'esm',
        name: 'Cannon',
        sourcemap: true,
      },
      {
        file: 'dist/cannon.umd.js',
        format: 'umd',
        name: 'Cannon',
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
  },
];
