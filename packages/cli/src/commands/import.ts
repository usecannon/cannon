import fs from 'fs-extra';
import { importChain } from '@usecannon/builder';
import { greenBright } from 'chalk';
import untildify from 'untildify';

export async function importPackage(cannonDirectory: string, importFile: string) {
  cannonDirectory = untildify(cannonDirectory);
  importFile = untildify(importFile);

  const info = await importChain(cannonDirectory, await fs.readFile(importFile));
  console.log(greenBright(`Imported ${info.name}:${info.version} from ${importFile} to ${cannonDirectory}`));
}
