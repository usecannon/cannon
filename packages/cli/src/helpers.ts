import os from 'os';
import { exec, spawnSync } from 'child_process';
import prompts from 'prompts';
import { magentaBright } from 'chalk';

export async function setupAnvil(): Promise<void> {
  const needsCargo = !(await hasCargo());
  if (needsCargo) {
    const cargoResponse = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: 'Cannon requires Cargo (https://doc.rust-lang.org/cargo/). Install it now?',
      initial: true,
    });

    if (cargoResponse.confirmation) {
      console.log(magentaBright('Installing Cargo...'));
      await execPromise('curl https://sh.rustup.rs -sSf | sh');
    } else {
      process.exit();
    }
  }

  const MINIMUM_NIGHTLY_ANVIL_BUILD_TIMESTAMP = 1657679573421;
  const versionDate = await getAnvilVersionDate();
  if (versionDate) {
    if (versionDate.getTime() < MINIMUM_NIGHTLY_ANVIL_BUILD_TIMESTAMP) {
      const anvilResponse = await prompts({
        type: 'confirm',
        name: 'confirmation',
        message: 'Cannon requires a newer version of Foundry. Install it now?',
        initial: true,
      });

      if (anvilResponse.confirmation) {
        console.log(magentaBright('Upgrading Foundry to the latest version...'));
        await execPromise('foundryup');
      } else {
        process.exit();
      }
    }
  } else {
    const response = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: 'Cannon requires Foundry. Install it now?',
      initial: true,
    });

    if (response.confirmation) {
      console.log(magentaBright('Installing Foundry...'));
      await execPromise('curl -L https://foundry.paradigm.xyz | bash');
      await execPromise(os.homedir() + '/.foundry/bin/foundryup');
    } else {
      process.exit();
    }
  }
}

async function hasCargo(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      const child = spawnSync('cargo', ['--version']);
      const output = child.stdout.toString();
      resolve(output.includes('cargo'));
      // May need to prompt for update (with rustup update), depends on anvil requirements.
    } catch {
      resolve(false);
    }
    resolve(false);
  });
}

async function getAnvilVersionDate(): Promise<Date | false> {
  return new Promise<Date | false>((resolve) => {
    try {
      const child = spawnSync('anvil', ['--version']);
      const output = child.stdout.toString();
      const timestamp = output.substring(output.indexOf('(') + 1, output.lastIndexOf(')')).split(' ')[1];
      resolve(new Date(timestamp));
    } catch {
      resolve(false);
    }
  });
}

function execPromise(command: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout.trim());
    });
  });
}
