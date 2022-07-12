import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import prompts from 'prompts';

export default async function installAnvil() {
  // Ensure our version of Anvil is installed
  try {
    await fs.promises.access(os.homedir() + '/.foundry/usecannon');
  } catch (err) {
    const response = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message:
        'Cannon requires a custom version of Anvil until a PR (https://bit.ly/3yUFF6W) is merged. This will be installed alongside any existing installations of Anvil. Continue?',
      initial: true,
    });

    if (response.confirmation) {
      await exec('curl -L https://foundry.paradigm.xyz | bash');
    } else {
      process.exit();
    }
  }
  await exec('foundryup -r usecannon/foundry');
  return;
}
