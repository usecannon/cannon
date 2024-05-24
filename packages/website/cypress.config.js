import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
// import webpack from '@cypress/webpack-preprocessor';
import { defineConfig } from 'cypress';

export async function setupNodeEvents1(on, config) {
  await addCucumberPreprocessorPlugin(on, config);

  return config;
}

export async function setupNodeEvents(on, config) {
  await addCucumberPreprocessorPlugin(on, config);

  on(
    'file:preprocessor',
    webpack({
      webpackOptions: {
        resolve: {
          extensions: ['.ts', '.js'],
        },
        module: {
          rules: [
            {
              test: /\.ts$/,
              exclude: [/node_modules/],
              use: [
                {
                  loader: 'ts-loader',
                },
              ],
            },
            {
              test: /\.feature$/,
              use: [
                {
                  loader: '@badeball/cypress-cucumber-preprocessor/webpack',
                  options: config,
                },
              ],
            },
          ],
        },
      },
    })
  );

  // Make sure to return the config object as it might have been modified by the plugin.
  return config;
}

export default defineConfig({
  e2e: {
    setupNodeEvents: setupNodeEvents1,
    baseUrl: 'http://localhost:3000',
    specPattern: '**/*.{feature,features}',
    supportFile: 'cypress/support/e2e.{ts,tsx}',
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
});
