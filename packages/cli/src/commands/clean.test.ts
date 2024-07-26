import { clean } from './clean';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import prompts from 'prompts';

import { log } from '../util/console';

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
      ])
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
