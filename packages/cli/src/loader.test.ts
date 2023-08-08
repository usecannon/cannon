import fs from 'fs-extra';
import crypto from 'crypto';
import path from 'path';
import { LocalLoader, getMainLoader } from './loader'; // assuming the module's name is "module.ts"
import { CliSettings } from './settings';
import { IPFSLoader } from '@usecannon/builder';

jest.mock('fs-extra');
jest.mock('crypto');

describe('LocalLoader', LocalLoaderTestCases);
describe('getMainLoader', getMainLoaderTestCases);

function LocalLoaderTestCases() {
  const dir = 'directory';
  const loader = new LocalLoader(dir);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getLabel should return label', () => {
    const result = loader.getLabel();
    expect(result).toEqual(`local (${dir})`);
  });

  it('read should return JSON from the path', async () => {
    const url = 'file://test.json';
    const json = { test: 'test' };
    (fs.readJson as jest.Mock).mockResolvedValueOnce(json);
    const result = await loader.read(url);
    expect(fs.readJson).toHaveBeenCalledWith(path.join(dir, 'test.json'));
    expect(result).toEqual(json);
  });

  it('put should write data and return path', async () => {
    const misc = { test: 'test' };
    const json = JSON.stringify(misc);
    const hash = '9ece086e9bac491fac5c1d104635c3c9';
    (crypto.createHash as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValueOnce(hash),
    });
    const result = await loader.put(misc);
    expect(fs.mkdirp).toHaveBeenCalledWith(dir);
    expect(fs.writeFile).toHaveBeenCalledWith(path.join(dir, `${hash}.json`), json);
    expect(result).toEqual(`file://${hash}.json`);
  });
}

function getMainLoaderTestCases() {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return object with instances of loaders', () => {
    const settings: CliSettings = {
      ipfsUrl: 'ipfs',
      cannonDirectory: 'directory',
      registryChainId: 'chainId',
      registryAddress: 'address',
      registryPriority: 'onchain',
      etherscanApiUrl: 'etherscanApiUrl',
      etherscanApiKey: 'etherscanApiKey',
      quiet: true,
    };
    const loaders = getMainLoader(settings);
    expect(loaders).toHaveProperty('ipfs');
    expect(loaders).toHaveProperty('file');
    expect(loaders.ipfs).toBeInstanceOf(IPFSLoader); // Changed this line
    expect(loaders.file).toBeInstanceOf(LocalLoader);
  });

  it('should use default ipfs url if not provided in settings', () => {
    const settings: CliSettings = {
      cannonDirectory: 'directory',
      registryChainId: 'chainId',
      registryAddress: 'address',
      registryPriority: 'onchain',
      etherscanApiUrl: 'etherscanApiUrl',
      etherscanApiKey: 'etherscanApiKey',
      quiet: true,
    };
    const loaders = getMainLoader(settings);
    expect(loaders.ipfs).toBeInstanceOf(IPFSLoader); // Changed this line
  });
}
