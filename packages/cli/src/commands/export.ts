import os from 'os';
import fs from 'fs-extra';
import { resolve } from 'path';
import { setupAnvil, findPackage } from '../helpers';
import { exportChain } from '@usecannon/builder';
import { greenBright } from 'chalk';

export async function exportPackage(cannonDirectory: string, exportFile: string, packageRef: string) {
  await setupAnvil();
  cannonDirectory = resolve(cannonDirectory.replace(/^~(?=$|\/|\\)/, os.homedir()));
  const { name, version } = findPackage(cannonDirectory, packageRef);

  if (!exportFile.endsWith('.zip')) {
    exportFile += '.zip';
  }

  const resolvedFilepath = resolve(exportFile);

  // warn if overwriting?

  const buf = await exportChain(cannonDirectory, name, version);
  await fs.writeFile(resolvedFilepath, buf);
  console.log(greenBright(`Exported ${name}@${version} to ${resolvedFilepath}`));
}
