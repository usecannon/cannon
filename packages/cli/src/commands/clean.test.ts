import { clean, cleanOrphanedIpfs } from './clean';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import prompts from 'prompts';

import { log } from '../util/console';
import * as console from '../util/console';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(),
}));

// Mocking 'prompts' module to control user input during testing
jest.mock('prompts');

describe('clean function', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log');
    // @ts-ignore - show wrong type for mocked function output
    jest.spyOn(fs, 'readdir').mockImplementation(() =>
      Promise.resolve([
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'dir1', isDirectory: () => true },
      ]),
    );
    jest.spyOn(fs, 'rm').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.resetAllMocks();
  });

  it('should return false if no files or folders found', async () => {
    (existsSync as jest.Mock).mockReturnValue(false);
    const result = await clean(false);
    expect(result).toBe(false);

    expect(log).toHaveBeenCalledWith('No files or folders found that could be deleted.');
  });

  it('should prompt for confirmation and delete files and directories if confirmed', async () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    (prompts as unknown as jest.Mock).mockResolvedValue({ confirmation: true });
    const result = await clean(true);
    expect(result).toBe(true);
    expect(fs.readdir).toHaveBeenCalled();
    // /tags/file1.txt /tags/file2.txt /metadata_cache/file1.txt /metadata_cache/file2.txt /ipfs_cache/file1.txt /ipfs_cache/file2.txt /build_results/file1.txt /build_results/file2.txt /blobs/file1.txt /blobs/file2.txt
    expect(fs.rm).toHaveBeenCalledTimes(10);
  });

  it('should not delete files or directories if not confirmed', async () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    (prompts as unknown as jest.Mock).mockResolvedValue({ confirmation: false });
    const result = await clean(true);
    expect(result).toBe(false);
    expect(fs.readdir).toHaveBeenCalled();
    expect(fs.rm).not.toHaveBeenCalled();
  });
});

describe('cleanOrphanedIpfs function', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.resetAllMocks();
  });

  it('should return success with no deletions when no orphaned files exist', async () => {
    // Mock tags directory with one tag
    (existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('tags')) return true;
      if (path.includes('ipfs_cache')) return true;
      return false;
    });

    // @ts-ignore
    jest.spyOn(fs, 'readdir').mockImplementation((dir: string) => {
      if (dir.includes('tags')) {
        return Promise.resolve(['package_1.0.0_1-main.txt', 'package_1.0.0_1-main.txt.meta']);
      }
      if (dir.includes('ipfs_cache')) {
        // Return files that match the tag's IPFS URLs
        // ipfs://QmXyz -> 58cd78e4d20301f9456940b3f1a735b5-qmxyz.json
        // ipfs://QmMeta -> 1cdfa4521e3d781a0da1a3d3ff4eeece-qmmeta.json
        return Promise.resolve([
          '58cd78e4d20301f9456940b3f1a735b5-qmxyz.json',
          '1cdfa4521e3d781a0da1a3d3ff4eeece-qmmeta.json',
        ]);
      }
      return Promise.resolve([]);
    });

    // Mock tag file contents and cache file contents
    jest.spyOn(fs, 'readFile').mockImplementation((path: any) => {
      const pathStr = path.toString();
      if (pathStr.includes('.txt') && !pathStr.includes('.meta')) {
        return Promise.resolve('ipfs://QmXyz') as any;
      }
      if (pathStr.includes('.meta')) {
        return Promise.resolve('ipfs://QmMeta') as any;
      }
      // Cache files - return JSON without nested IPFS URLs
      if (pathStr.includes('ipfs_cache')) {
        return Promise.resolve('{"state": {}}') as any;
      }
      return Promise.resolve('') as any;
    });

    const result = await cleanOrphanedIpfs(false);

    expect(result.success).toBe(true);
    expect(result.stats.orphanedFiles).toBe(0);
  });

  it('should identify and delete orphaned IPFS files', async () => {
    (existsSync as jest.Mock).mockReturnValue(true);

    // @ts-ignore
    jest.spyOn(fs, 'readdir').mockImplementation((dir: string) => {
      if (dir.includes('tags')) {
        return Promise.resolve(['package_1.0.0_1-main.txt']);
      }
      if (dir.includes('ipfs_cache')) {
        // ipfs://QmXyz -> 58cd78e4d20301f9456940b3f1a735b5-qmxyz.json (referenced)
        // ipfs://QmAbc -> d7195b608c408f59397fc013eba8fef4-qmabc.json (orphaned)
        return Promise.resolve([
          '58cd78e4d20301f9456940b3f1a735b5-qmxyz.json',
          'd7195b608c408f59397fc013eba8fef4-qmabc.json',
        ]);
      }
      return Promise.resolve([]);
    });

    // Mock tag file contents and cache file contents
    jest.spyOn(fs, 'readFile').mockImplementation((path: any) => {
      const pathStr = path.toString();
      if (pathStr.includes('.txt')) {
        return Promise.resolve('ipfs://QmXyz') as any;
      }
      // Cache files - no nested IPFS URLs
      if (pathStr.includes('ipfs_cache')) {
        return Promise.resolve('{"state": {}}') as any;
      }
      return Promise.resolve('') as any;
    });

    // Mock unlink
    jest.spyOn(fs, 'unlink').mockImplementation(() => Promise.resolve());

    const result = await cleanOrphanedIpfs(false);

    expect(result.success).toBe(true);
    expect(result.stats.totalFiles).toBe(2);
    expect(result.stats.orphanedFiles).toBe(1);
    expect(result.stats.deletedFiles).toBe(1);
  });

  it('should not delete files when user cancels confirmation', async () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    (prompts as unknown as jest.Mock).mockResolvedValue({ value: false });

    // @ts-ignore
    jest.spyOn(fs, 'readdir').mockImplementation((dir: string) => {
      if (dir.includes('tags')) {
        return Promise.resolve(['package_1.0.0_1-main.txt']);
      }
      if (dir.includes('ipfs_cache')) {
        // Only orphaned file: ipfs://QmAbc
        return Promise.resolve(['d7195b608c408f59397fc013eba8fef4-qmabc.json']);
      }
      return Promise.resolve([]);
    });

    jest.spyOn(fs, 'readFile').mockImplementation((path: any) => {
      const pathStr = path.toString();
      if (pathStr.includes('.txt')) {
        return Promise.resolve('ipfs://QmXyz') as any;
      }
      // Cache files - no nested IPFS URLs
      if (pathStr.includes('ipfs_cache')) {
        return Promise.resolve('{"state": {}}') as any;
      }
      return Promise.resolve('') as any;
    });

    const unlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation(() => Promise.resolve());

    const result = await cleanOrphanedIpfs(true);

    expect(result.success).toBe(false);
    expect(unlinkSpy).not.toHaveBeenCalled();
  });

  it('should preserve second-order IPFS dependencies', async () => {
    (existsSync as jest.Mock).mockReturnValue(true);

    // We have:
    // - Tag references ipfs://QmRoot
    // - QmRoot's cache file contains a reference to ipfs://QmNested
    // - QmNested's cache file contains a reference to ipfs://QmDeep
    // - ipfs://QmOrphan is not referenced by anything
    // All of QmRoot, QmNested, QmDeep should be kept; QmOrphan should be deleted

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    const hashOf = (cid: string) => {
      const md5 = crypto.createHash('md5').update(cid).digest('hex');
      return `${md5}-${cid.toLowerCase()}`;
    };

    const rootHash = hashOf('QmRoot');
    const nestedHash = hashOf('QmNested');
    const deepHash = hashOf('QmDeep');
    const orphanHash = hashOf('QmOrphan');

    // @ts-ignore
    jest.spyOn(fs, 'readdir').mockImplementation((dir: string) => {
      if (dir.includes('tags')) {
        return Promise.resolve(['package_1.0.0_1-main.txt']);
      }
      if (dir.includes('ipfs_cache')) {
        return Promise.resolve([`${rootHash}.json`, `${nestedHash}.json`, `${deepHash}.json`, `${orphanHash}.json`]);
      }
      return Promise.resolve([]);
    });

    jest.spyOn(fs, 'readFile').mockImplementation((filePath: any) => {
      const pathStr = filePath.toString();
      // Tag file
      if (pathStr.includes('.txt')) {
        return Promise.resolve('ipfs://QmRoot') as any;
      }
      // Cache files with nested IPFS references
      if (pathStr.includes(rootHash)) {
        return Promise.resolve(
          JSON.stringify({
            state: { 'deploy.Contract': { url: 'ipfs://QmNested' } },
          }),
        ) as any;
      }
      if (pathStr.includes(nestedHash)) {
        return Promise.resolve(
          JSON.stringify({
            state: { 'deploy.Sub': { metaUrl: 'ipfs://QmDeep' } },
          }),
        ) as any;
      }
      if (pathStr.includes(deepHash)) {
        return Promise.resolve(JSON.stringify({ state: {} })) as any;
      }
      if (pathStr.includes(orphanHash)) {
        return Promise.resolve(JSON.stringify({ state: {} })) as any;
      }
      return Promise.resolve('') as any;
    });

    jest.spyOn(fs, 'unlink').mockImplementation(() => Promise.resolve());

    const result = await cleanOrphanedIpfs(false);

    expect(result.success).toBe(true);
    expect(result.stats.totalFiles).toBe(4);
    // QmRoot (direct), QmNested (second-order), QmDeep (third-order) = 3 referenced
    expect(result.stats.referencedFiles).toBe(3);
    // Only QmOrphan should be orphaned
    expect(result.stats.orphanedFiles).toBe(1);
    expect(result.stats.deletedFiles).toBe(1);
  });
});
