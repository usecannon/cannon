import fs from 'fs-extra';
import { resolve } from 'path';
import { setupAnvil } from '../helpers';
import { importChain } from '@usecannon/builder';
import { greenBright } from 'chalk';

export async function importPackage(packagesDir: string, exportFile: string) {
  await setupAnvil();

  const resolvedPackagesDir = resolve(packagesDir);
  const resolvedFilepath = resolve(exportFile);

  const info = await importChain(resolvedPackagesDir, await fs.readFile(resolvedFilepath));
  console.log(greenBright(`Imported ${info.name}@${info.version} from ${resolvedFilepath} to ${resolvedPackagesDir}`));
}
