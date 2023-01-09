/* eslint-disable */
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const typescript = require('rollup-plugin-typescript');
const json = require('@rollup/plugin-json');
const pkg = require('./package.json');

module.exports = [
  // browser-friendly UMD build
  {
    input: 'src/index.ts',
    output: {
      name: 'cannon',
      file: pkg.browser,
      format: 'umd',
    },
    plugins: [
      resolve(), // so Rollup can find deps
      commonjs(), // so Rollup can convert deps to an ES module
      typescript(), // so Rollup can convert TypeScript to JavaScript
      json(), // so Rollup can import JSON files
    ],
  },
];
