import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';
import Debug from 'debug';
import prompts from 'prompts';

import { log } from '../util/console';
import { resolveCliSettings } from '../settings';
import { IPFSLoader } from '@usecannon/builder';

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

/**
 * Get the cache file path for an IPFS URL
 * Matches the logic in CliLoader.getCacheHash
 */
function getCacheHash(url: string): string {
  const qmhash = url.replace(IPFSLoader.PREFIX, '');
  const md5 = crypto.createHash('md5').update(qmhash).digest('hex');
  return `${md5}-${qmhash.toLowerCase()}`;
}

/**
 * Read all tag files and extract referenced IPFS URLs
 */
async function getReferencedIpfsUrls(tagsDir: string): Promise<Set<string>> {
  const referencedUrls = new Set<string>();

  if (!existsSync(tagsDir)) {
    return referencedUrls;
  }

  const tagFiles = await fs.readdir(tagsDir);

  for (const file of tagFiles) {
    // Process both .txt files (main package URL) and .meta files (metadata URL)
    if (!file.endsWith('.txt') && !file.endsWith('.meta')) continue;

    const filePath = path.join(tagsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const url = content.trim();

    if (url.startsWith('ipfs://')) {
      referencedUrls.add(url);
      debug(`Found referenced URL in ${file}: ${url}`);
    }
  }

  return referencedUrls;
}

/**
 * Get all IPFS cache files
 */
async function getIpfsCacheFiles(ipfsCacheDir: string): Promise<string[]> {
  if (!existsSync(ipfsCacheDir)) {
    return [];
  }

  const files = await fs.readdir(ipfsCacheDir);
  return files.filter((f) => f.endsWith('.json'));
}

export interface CleanIpfsStats {
  totalFiles: number;
  referencedFiles: number;
  superfluousFiles: number;
  deletedFiles: number;
  failedFiles: number;
  freedBytes: number;
}

/**
 * Clean superfluous IPFS packages (packages not referenced by any tag)
 */
export async function cleanSuperfluousIpfs(confirm = true): Promise<{ success: boolean; stats: CleanIpfsStats }> {
  const settings = resolveCliSettings();

  const tagsDir = path.join(settings.cannonDirectory, 'tags');
  const ipfsCacheDir = path.join(settings.cannonDirectory, 'ipfs_cache');

  const stats: CleanIpfsStats = {
    totalFiles: 0,
    referencedFiles: 0,
    superfluousFiles: 0,
    deletedFiles: 0,
    failedFiles: 0,
    freedBytes: 0,
  };

  // Get all referenced IPFS URLs from tags
  const referencedUrls = await getReferencedIpfsUrls(tagsDir);
  debug(`Found ${referencedUrls.size} referenced IPFS URLs in tags`);

  // Get all IPFS cache files
  const cacheFiles = await getIpfsCacheFiles(ipfsCacheDir);
  stats.totalFiles = cacheFiles.length;
  debug(`Found ${cacheFiles.length} IPFS cache files`);

  // Build a set of referenced cache hashes for quick lookup
  const referencedHashes = new Set<string>();
  for (const url of referencedUrls) {
    referencedHashes.add(getCacheHash(url));
  }

  // Find superfluous files (not referenced by any tag)
  const superfluousFiles: { file: string; size: number }[] = [];

  for (const file of cacheFiles) {
    // Extract the hash part from the filename (format: {md5}-{cid}.json)
    const hashPart = file.replace('.json', '');

    if (referencedHashes.has(hashPart)) {
      stats.referencedFiles++;
      debug(`File ${file} is referenced, keeping`);
    } else {
      const filePath = path.join(ipfsCacheDir, file);
      const fileStat = await fs.stat(filePath);
      superfluousFiles.push({ file, size: fileStat.size });
      stats.superfluousFiles++;
      debug(`File ${file} is superfluous, marking for deletion`);
    }
  }

  if (stats.superfluousFiles === 0) {
    log('No superfluous IPFS packages found.');
    return { success: true, stats };
  }

  // Show what will be deleted
  log(`Found ${stats.superfluousFiles} superfluous IPFS package(s) (out of ${stats.totalFiles} total):`);
  for (const { file, size } of superfluousFiles) {
    log(`  - ${file} (${formatBytes(size)})`);
  }
  log();

  const totalSize = superfluousFiles.reduce((sum, f) => sum + f.size, 0);
  log(`Total space to free: ${formatBytes(totalSize)}`);
  log();

  if (confirm) {
    const confirmation = await prompts({
      type: 'confirm',
      name: 'value',
      message: 'Delete these superfluous IPFS packages?',
      initial: false,
    });

    if (!confirmation.value) {
      log('Cancelled.');
      return { success: false, stats };
    }
  }

  // Delete superfluous files
  for (const { file, size } of superfluousFiles) {
    const filePath = path.join(ipfsCacheDir, file);
    try {
      await fs.unlink(filePath);
      stats.deletedFiles++;
      stats.freedBytes += size;
      debug(`Deleted ${file}`);
    } catch (error: unknown) {
      stats.failedFiles++;
      if (error instanceof Error) {
        debug(`Failed to delete ${file}: ${error.message}`);
      }
    }
  }

  log();
  log(`Deleted ${stats.deletedFiles} superfluous IPFS package(s), freed ${formatBytes(stats.freedBytes)}.`);
  if (stats.failedFiles > 0) {
    log(`Failed to delete ${stats.failedFiles} file(s).`);
  }

  return { success: true, stats };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
