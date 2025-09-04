import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import untildify from 'untildify';
import prompts from 'prompts';
import { bold, gray, green, italic, yellow } from 'chalk';

import { ensureFoundryCompatibility } from '../helpers';
import { CLI_SETTINGS_STORE } from '../constants';
import { resolveCliSettings } from '../settings';
import { logSpinner } from '../util/console';

export async function setup() {
  // ensure foundry compatibility
  await ensureFoundryCompatibility();

  // exit if settings is already configured
  if (process.env.CANNON_SETTINGS) {
    logSpinner('Your Cannon settings are being explicitly defined as follows:');
    logSpinner(JSON.stringify(process.env.CANNON_SETTINGS));
    return;
  }

  const settings = resolveCliSettings();
  const cliSettingsStore = untildify(path.join(settings.cannonDirectory, CLI_SETTINGS_STORE));
  logSpinner(
    'Cannon’s settings are optional. They can be defined in a JSON file and overridden with environment variables.\n'
  );
  logSpinner(`This will update your settings stored in ${cliSettingsStore}`);

  const configExists = fs.existsSync(cliSettingsStore);
  let fileSettings = configExists ? fs.readJsonSync(cliSettingsStore) : {};

  Object.entries(fileSettings).map(([k, v]: [string, any]) => logSpinner(`${gray('›')} ${bold(k)} - ${v}`));
  logSpinner('');

  const questions: prompts.PromptObject[] = [
    {
      type: 'text',
      name: 'publishIpfsUrl',
      message:
        'Enter an IPFS URL for uploading packages when using the publish and pin commands (instead of the Cannon IPFS cluster)\n',
      initial: fileSettings.publishIpfsUrl,
    },
    {
      type: 'text',
      name: 'ipfsUrl',
      message: 'Enter an IPFS URL for reading package data (in addition to the Cannon IPFS cluster)\n',
      initial: fileSettings.ipfsUrl,
    },
    {
      type: 'text',
      name: 'writeIpfsUrl',
      message: 'Enter an IPFS URL for writing package data during builds (in addition to your local filesystem)\n',
      initial: fileSettings.writeIpfsUrl,
    },
  ];

  const response = await prompts(questions, {
    onCancel: () => {
      logSpinner(bold('Aborting...'));
      logSpinner(yellow(italic('No changes were made to your configuration.')));
      process.exit(0);
    },
  });

  if (response.publishIpfsUrl) {
    fileSettings.publishIpfsUrl = response.publishIpfsUrl;
  }

  if (response.ipfsUrl) {
    fileSettings.ipfsUrl = response.ipfsUrl;
  }

  if (response.writeIpfsUrl) {
    fileSettings.writeIpfsUrl = response.writeIpfsUrl;
  }

  logSpinner(`\nSaving ${cliSettingsStore}`);
  fileSettings = _.omitBy(fileSettings, _.isEmpty);
  await fs.mkdirp(path.dirname(cliSettingsStore));
  fs.writeFileSync(cliSettingsStore, JSON.stringify(fileSettings), 'utf8');
  logSpinner(green('Cannon settings updated successfully'));
}
