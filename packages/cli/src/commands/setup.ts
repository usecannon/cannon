import { setupAnvil } from '../helpers';
import fs from 'fs-extra';
import path from 'path';
import untildify from 'untildify';
import prompts from 'prompts';
import {
  DEFAULT_CANNON_DIRECTORY,
  CLI_SETTINGS_STORE,
  DEFAULT_REGISTRY_PROVIDER_URL,
  DEFAULT_REGISTRY_ADDRESS,
} from '../constants';
import _ from 'lodash';
import { bold, italic, yellow } from 'chalk';

export async function setup() {
  // Setup Anvil
  await setupAnvil();

  // Exit if using env var
  if (process.env.CANNON_SETTINGS) {
    console.log('Your Cannon settings are configured in the environmental variable ____, as follows:');
    console.log(JSON.stringify(process.env.CANNON_SETTINGS));
    return;
  }

  // Configure settings.json
  console.log(
    'Cannon can retrieve and run packages from the registry using public Ethereum and IPFS endpoints, but you need to set custom endpoints to build and publish packages.'
  );

  const cliSettingsStore = untildify(
    path.join(process.env.CANNON_DIRECTORY || DEFAULT_CANNON_DIRECTORY, CLI_SETTINGS_STORE)
  );

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
        'What IPFS endpoint would you like to use when publishing packages? (This may start with https+ipfs://) Avoid using Infura, as pinned files can’t be reliably accessed from other gateways. You can leave this blank and set it later.\n',
      initial: fileSettings.publishIpfsUrl,
    },
    {
      type: 'text',
      name: 'ipfsUrl',
      message:
        'What IPFS endpoint would you like to use when building? This can be local (e.g. http://localhost:5001 when running a local IPFS daemon) or remote.\n',
      initial: fileSettings.ipfsUrl || fileSettings.publishIpfsUrl || '',
    },
    {
      type: 'text',
      name: 'registryProviderUrl',
      message:
        'Which RPC endpoint would you like to use when interacting with the registry? You can leave this blank to continue using the default endpoint, but it may be unreliable or slow.\n',
      initial: fileSettings.registryProviderUrl || DEFAULT_REGISTRY_PROVIDER_URL || '',
    },
    {
      type: 'text',
      name: 'registryAddress',
      message: 'Optionally, you can set a custom registry address. It is strongly recommended that you use the default.\n',
      initial: fileSettings.registryAddress || DEFAULT_REGISTRY_ADDRESS || '',
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

  // Only write this to the file if it's different from the default, so this can be upgraded in the future.
  if (response.registryProviderUrl && response.registryProviderUrl != DEFAULT_REGISTRY_PROVIDER_URL) {
    fileSettings.registryProviderUrl = response.registryProviderUrl;
  }

  // Only write this to the file if it's different from the default, so this can be upgraded in the future.
  if (response.registryAddress && response.registryAddress != DEFAULT_REGISTRY_ADDRESS) {
    fileSettings.registryAddress = response.registryAddress;
  }

  console.log(`Writing configuration to ${cliSettingsStore}...`);
  fileSettings = _.omitBy(fileSettings, _.isEmpty);
  await fs.mkdirp(path.dirname(cliSettingsStore));
  fs.writeFileSync(cliSettingsStore, JSON.stringify(fileSettings), 'utf8');
  console.log('Done!');
}
