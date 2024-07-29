import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import Debug from 'debug';
import prompts from 'prompts';

import { log } from '../util/console';
import { resolveCliSettings } from '../settings';

const debug = Debug('cannon:cli:clean');

export async function clean(confirm = true) {
  const settings = resolveCliSettings();

  const folders = ['tags', 'metadata_cache', 'ipfs_cache', 'build_results', 'blobs'].map((dir) => {
    return path.join(settings.cannonDirectory, dir);
  });

  const filesAndDirs = await Promise.all(
    folders.map(async (dir) => {
      if (!existsSync(dir)) return [];
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.map((entry) => path.join(dir, entry.name));
    })
  ).then((entries) => entries.flat());

  if (!filesAndDirs.length) {
    log('No files or folders found that could be deleted.');
    return false;
  }

  log('Found the following files and/or folders for deletion:');
  for (const entry of filesAndDirs) log(`  - ${entry}`);
  log();

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
    filesAndDirs.map(async (entry) => {
      try {
        debug(`removing entry: ${entry}`);
        await fs.rm(entry, { recursive: true });
      } catch (error: unknown) {
        if (error instanceof Error) {
          debug(`error removing entry ${entry}: ${error.message}`);
        } else {
          debug('An error has occurred');
        }
      }
    })
  );

  return true;
}
