import fs from 'fs-extra';
import { resolve } from 'path';
import { setupAnvil, findPackage } from '../helpers';
import { exportChain } from '@usecannon/builder';
import { greenBright } from 'chalk';

export async function exportPackage(packagesDir: string, exportFile: string, packageRef: string) {
  await setupAnvil();
  const { name, version } = findPackage(packageRef);

  const resolvedPackagesDir = resolve(packagesDir);
  const resolvedFilepath = resolve(exportFile);

  const buf = await exportChain(resolvedPackagesDir, name, version);
  await fs.writeFile(resolvedFilepath, buf);
  console.log(greenBright(`Exported ${name}@${version}`));
}
