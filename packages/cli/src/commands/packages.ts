import os from 'os';
import { resolve } from 'path';
import fs from 'fs-extra';
import prompts from 'prompts';
import { inspect } from './inspect';
import { bold, magentaBright } from 'chalk';

export async function packages(cannonDirectory: string) {
  cannonDirectory = resolve(cannonDirectory.replace(/^~(?=$|\/|\\)/, os.homedir()));
  const packages = await fs.readdir(resolve(cannonDirectory));

  const packageChoices = packages.sort().map((s) => {
    return { title: s };
  });

  console.log(bold(magentaBright(`The following packages are in ${cannonDirectory}`)));
  const { pickedPackageName } = await prompts.prompt([
    {
      type: 'autocomplete',
      name: 'pickedPackageName',
      message: 'Select a package to view available versions:',
      choices: packageChoices,
      suggest: suggestBySubtring,
    },
  ]);

  const versions = await fs.readdir(resolve(cannonDirectory, pickedPackageName));
  const versionChoices = versions.sort().map((s) => {
    return { title: s };
  });
  const { pickedVersionName } = await prompts.prompt([
    {
      type: 'autocomplete',
      name: 'pickedVersionName',
      message: 'Select a package version to inspect:',
      choices: versionChoices,
      suggest: suggestBySubtring,
    },
  ]);

  await inspect(cannonDirectory, `${pickedPackageName}:${pickedVersionName}`, false);
}

// filters choices by subtrings that don't have to be continuous e.g. 'ybtc' will match 'SynthsBTC'
const suggestBySubtring = (input: string, choices: [{ title: string }]) =>
  Promise.resolve(
    choices.filter((choice) => {
      const titleStr = choice.title.toLowerCase();
      let index = 0;
      for (const c of input.toLowerCase()) {
        index = titleStr.indexOf(c, index);
        if (index === -1) {
          return false; // not found
        } else {
          index += 1; // start from next index
        }
      }
      return true;
    })
  );
