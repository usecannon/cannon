import fs from 'fs-extra';
import { resolve } from 'path';
import { setupAnvil } from '../helpers';
import { importChain } from '@usecannon/builder';
import { greenBright } from 'chalk';

export async function importPackage(packagesDir: string, exportFile: string) {
  await setupAnvil();

  //TODO: Resolve isn't right here, just need to it probably find the homedir with ~
  const resolvedPackagesDir = resolve(packagesDir);
  const resolvedFilepath = resolve(exportFile);

  const info = await importChain(resolvedPackagesDir, await fs.readFile(resolvedFilepath));
  console.log(greenBright(`Imported ${info.name}@${info.version} from ${resolvedFilepath} to ${resolvedPackagesDir}`));
}
