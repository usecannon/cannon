import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import Debug from 'debug';
import prompts from 'prompts';
import { resolveCliSettings } from '../settings';

const debug = Debug('cannon:cli:clean');

export async function clean(confirm = true) {
  const settings = resolveCliSettings();

  const folders = ['tags', 'metadata_cache'].map((dir) => path.join(settings.cannonDirectory, dir));

  const files = await Promise.all(
    folders.map(async (dir) => {
      if (!existsSync(dir)) return [];
      const files = await fs.readdir(dir);
      return files.filter((file) => path.extname(file) === '.txt').map((file) => path.join(dir, file));
    })
  ).then((files) => files.flat());

  if (!files.length) {
    console.log('No files found that could be deleted.');
    return false;
  }

  console.log('Found the following files for deletion:');
  for (const file of files) console.log(`  - ${file}`);
  console.log();

  if (confirm) {
    const confirm = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: 'Are you sure you want to delete them?',
      initial: false,
    });

    if (!confirm.confirmation) return false;
  }

  await Promise.all(
    files.map(async (file) => {
      debug(`removing file: ${file}`);
      await fs.rm(file);
    })
  );

  return true;
}
