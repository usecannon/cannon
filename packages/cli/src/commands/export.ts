import fs from 'fs-extra';
import { exportChain } from '@usecannon/builder';
import { greenBright } from 'chalk';
import prompts from 'prompts';
import untildify from 'untildify';

export async function exportPackage(cannonDirectory: string, exportFile: string, packageRef: string) {
  const packageName = packageRef.split(':')[0];
  const packageVersion = packageRef.includes(':') ? packageRef.split(':')[1] : 'latest';
  cannonDirectory = untildify(cannonDirectory);

  if (!exportFile) {
    exportFile = `${packageName}.${packageVersion}`;
  }

  if (!exportFile.endsWith('.zip')) {
    exportFile += '.zip';
  }

  const resolvedFilepath = untildify(exportFile);
  if (fs.existsSync(resolvedFilepath)) {
    const confirmationResponse = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: `A file already exists at ${resolvedFilepath} Overwrite it?`,
      initial: false,
    });

    if (!confirmationResponse.confirmation) {
      process.exit();
    }
  }

  const buf = await exportChain(cannonDirectory, packageName, packageVersion);
  await fs.writeFile(resolvedFilepath, buf);
  console.log(greenBright(`Exported ${packageName}:${packageVersion} to ${resolvedFilepath}`));
}
