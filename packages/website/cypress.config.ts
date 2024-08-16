import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    defaultCommandTimeout: 1000_000,
    pageLoadTimeout: 1000_000,
    requestTimeout: 1000_000,
    responseTimeout: 1000_000,
    specPattern: '**/*.feature',
    baseUrl: 'http://localhost:3000',
    video: false, // GH provides 2 CPUs, and cypress video eats one up, ref https://github.com/cypress-io/cypress/issues/20468#issuecomment-1307608025
    experimentalMemoryManagement: true, // better memory management, ref https://github.com/cypress-io/cypress/pull/2546
    supportFile: 'cypress/support/commands.ts',
    reporter: require.resolve('@badeball/cypress-cucumber-preprocessor/pretty-reporter'),
    async setupNodeEvents(
      on: Cypress.PluginEvents,
      config: Cypress.PluginConfigOptions
    ): Promise<Cypress.PluginConfigOptions> {
      // This is required for the preprocessor to be able to generate JSON reports after each run, and more,
      await addCucumberPreprocessorPlugin(on, config);

      // create a custom task to log messages
      on('task', {
        log(message) {
          // eslint-disable-next-line no-console
          console.log(message);
          return null;
        },
      });

      on(
        'file:preprocessor',
        createBundler({
          // @ts-ignore: cypress-cucumber-preprocessor types are not up to date
          plugins: [createEsbuildPlugin(config)],
        })
      );

      // Make sure to return the config object as it might have been modified by the plugin.
      return config;
    },
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
});
