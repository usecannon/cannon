import { setupAnvil } from '../helpers';
import fs from 'fs-extra';
import path from 'path';
import untildify from 'untildify';
import prompts from 'prompts';
import { DEFAULT_CANNON_DIRECTORY, CLI_SETTINGS_STORE } from '../constants';
import _ from 'lodash';

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
  let fileSettings = fs.existsSync(cliSettingsStore) ? fs.readJsonSync(cliSettingsStore) : {};

  console.log(`\nThis will ${_.isEmpty(fileSettings) ? 'store' : 'update'} your configuration at ${cliSettingsStore}\n`);

  const response1 = await prompts({
    type: 'text',
    name: 'publishIpfsUrl',
    message:
      'What IPFS endpoint would you like to use when publishing packages? (This may look like https://<project-id>:<api-key-secret>@ipfs.infura.io:5001) You can leave this blank and set it later.\n',
    initial: fileSettings.publishIpfsUrl,
  });
  fileSettings.publishIpfsUrl = response1.publishIpfsUrl;

  const response2 = await prompts({
    type: 'text',
    name: 'ipfsUrl',
    message:
      'What IPFS endpoint would you like to use when building? This can be local (e.g. http://localhost:5001 when running a local IPFS daemon) or remote, like Infura.\n',
    initial: fileSettings.ipfsUrl || fileSettings.publishIpfsUrl || '',
  });
  fileSettings.ipfsUrl = response2.ipfsUrl;

  const response3 = await prompts({
    type: 'text',
    name: 'registryProviderUrl',
    message:
      'Which RPC endpoint would you like to use when interacting with the registry? You can leave this blank to continue using the default endpoint, but it may be unreliable or slow.\n',
  });
  fileSettings.registryProviderUrl = response3.registryProviderUrl;

  console.log(`Writing configuration to ${cliSettingsStore}...`);
  fileSettings = _.omitBy(fileSettings, _.isEmpty);
  fs.writeFileSync(cliSettingsStore, JSON.stringify(fileSettings), 'utf8');
  console.log('Done!');
}
