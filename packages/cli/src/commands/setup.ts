import { setupAnvil } from '../helpers';
import fs from 'fs-extra';
import path from 'path';
import untildify from 'untildify';
import prompts from 'prompts';
import { CLI_SETTINGS_STORE } from '../constants';
import { resolveCliSettings } from '../settings';
import _ from 'lodash';
import { bold, italic, yellow } from 'chalk';

export async function setup() {
  // Setup Anvil
  await setupAnvil();

  const settings = resolveCliSettings();

  // Exit if settings is already configured
  if (settings.cannonSettings) {
    console.log('Your Cannon settings are configured in the environmental variable ____, as follows:');
    console.log(JSON.stringify(settings.cannonSettings));
    return;
  }

  // Configure settings.json
  console.log(
    'Cannon can retrieve and run packages from the registry using public Ethereum and IPFS endpoints, but you need to set custom endpoints to build and publish packages.'
  );

  const cliSettingsStore = untildify(path.join(settings.cannonDirectory, CLI_SETTINGS_STORE));

  const configExists = fs.existsSync(cliSettingsStore);
  let fileSettings = configExists ? fs.readJsonSync(cliSettingsStore) : {};

  if (configExists) {
    console.log(`\nThis will update your configuration at ${cliSettingsStore} with current value:`);
    console.dir(fileSettings);
  } else {
    console.log(`\nThis will store your configuration at ${cliSettingsStore} which will be created\n`);
  }

  const questions: prompts.PromptObject[] = [
    {
      type: 'text',
      name: 'publishIpfsUrl',
      message:
        'What IPFS endpoint would you like to use when publishing packages? Avoid using Infura, as pinned files can’t be reliably accessed from other gateways. You can leave this blank and set it later.\n',
      initial: fileSettings.publishIpfsUrl,
    },
    {
      type: 'text',
      name: 'ipfsUrl',
      message:
        'What IPFS endpoint would you like to use when building? This can be local (e.g. http://localhost:5001 when running a local IPFS daemon) or remote.\n',
      initial: fileSettings.ipfsUrl || fileSettings.publishIpfsUrl || '',
    },
  ];

  const response = await prompts(questions, {
    onCancel: () => {
      console.log(bold('Aborting...'));
      console.log(yellow(italic('No changes were made to your configuration.')));
      process.exit(0);
    },
  });

  if (response.publishIpfsUrl) {
    fileSettings.publishIpfsUrl = response.publishIpfsUrl;
  }

  if (response.ipfsUrl) {
    fileSettings.ipfsUrl = response.ipfsUrl;
  }

  console.log(`Writing configuration to ${cliSettingsStore}...`);
  fileSettings = _.omitBy(fileSettings, _.isEmpty);
  await fs.mkdirp(path.dirname(cliSettingsStore));
  fs.writeFileSync(cliSettingsStore, JSON.stringify(fileSettings), 'utf8');
  console.log('Done!');
}
