import os from 'os';
import { exec, spawnSync } from 'child_process';
import prompts from 'prompts';
import { magentaBright, yellowBright, yellow, bold } from 'chalk';

export async function setupAnvil(): Promise<void> {
  const versionDate = await getAnvilVersionDate();
  if (versionDate) {
    // Confirm we have a version after the anvil_loadState/anvil_dumpState functionality was added.
    if (versionDate.getTime() < 1657679573421) {
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

export async function checkCannonVersion(currentVersion: string): Promise<void> {
  const latestVersion = await execPromise('npm view @usecannon/cli version');
  if (currentVersion !== latestVersion) {
    console.warn(yellowBright(`⚠️  There is a new version of Cannon (${latestVersion})`));
    console.warn(yellow(`Upgrade with ` + bold(`npm install -g @usecannon/cli\n`)));
  }
}
