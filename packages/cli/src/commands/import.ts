import os from 'os';
import fs from 'fs-extra';
import { resolve } from 'path';
import { importChain } from '@usecannon/builder';
import { greenBright } from 'chalk';

export async function importPackage(cannonDirectory: string, importFile: string) {
  cannonDirectory = resolve(cannonDirectory.replace(/^~(?=$|\/|\\)/, os.homedir()));
  importFile = resolve(importFile.replace(/^~(?=$|\/|\\)/, os.homedir()));

  const info = await importChain(cannonDirectory, await fs.readFile(importFile));
  console.log(greenBright(`Imported ${info.name}:${info.version} from ${importFile} to ${cannonDirectory}`));
}
