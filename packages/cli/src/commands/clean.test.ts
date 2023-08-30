import { clean } from './clean';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import prompts from 'prompts';

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
    jest.spyOn(fs, 'readdir').mockImplementation(() => Promise.resolve(['file1.txt', 'file2.txt']));
    jest.spyOn(fs, 'rm').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.resetAllMocks();
  });

  it('should return false if no files found', async () => {
    (existsSync as jest.Mock).mockReturnValue(false);
    const result = await clean(false);
    expect(result).toBe(false);
    expect(console.log).toHaveBeenCalledWith('No files found that could be deleted.');
  });

  it('should prompt for confirmation and delete files if confirmed', async () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    (prompts as unknown as jest.Mock).mockResolvedValue({ confirmation: true });
    const result = await clean(true);
    expect(result).toBe(true);
    expect(fs.readdir).toHaveBeenCalled();
    // /tags/file1.txt /tags/file2.txt /metadata_cache/file1.txt /metadata_cache/file2.txt
    expect(fs.rm).toHaveBeenCalledTimes(4);
  });

  it('should not delete files if not confirmed', async () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    (prompts as unknown as jest.Mock).mockResolvedValue({ confirmation: false });
    const result = await clean(true);
    expect(result).toBe(false);
    expect(fs.readdir).toHaveBeenCalled();
    expect(fs.rm).not.toHaveBeenCalled();
  });
});
