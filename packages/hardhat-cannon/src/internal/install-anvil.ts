import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import prompts from 'prompts';

export default async function installAnvil() {
  // Ensure our version of Anvil is installed
  try {
    await exec('anvil --version');
  } catch (err) {
    const response = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: 'Cannon requires the foundry toolchain to be installed. Continue?',
      initial: true,
    });

    if (response.confirmation) {
      await exec('curl -L https://foundry.paradigm.xyz | bash');
      await exec('foundryup');
    } else {
      process.exit();
    }
  }
  return;
}
