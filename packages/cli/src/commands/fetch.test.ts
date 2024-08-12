import fs from 'node:fs';
import path from 'node:path';
import { CannonStorage, DeploymentInfo, IPFSLoader } from '@usecannon/builder';
import { resolveCliSettings } from '@usecannon/cli/src/settings';
import * as viem from 'viem';
import mockfs from 'mock-fs';
import { CliLoader, getMainLoader, LocalLoader } from '../loader';
import { createDefaultReadRegistry, LocalRegistry } from '../registry';
import * as settings from '../settings';
import { fetch } from './fetch';

jest.mock('../registry');
jest.mock('../settings');
jest.mock('../loader');
jest.mock('../helpers');

describe('fetch', () => {
  const tags = ['tag0', 'tag1'];
  const chainId = 123;
  const preset = 'your-preset';
  const basePackageRef = 'package:1.2.3';
  const deployDataLocalFileName = `${basePackageRef.replace(':', '_')}_${chainId}-${preset}.txt`;
  const deployMetaDataLocalFileName = `${basePackageRef.replace(':', '_')}_${chainId}-${preset}.txt.meta`;

  const miscData = { misc: 'info' };
  const metaData = { itsMeta: 'data' };

  const testPkgData: DeploymentInfo = {
    generator: 'cannon test',
    timestamp: 1234567890,
    def: { name: 'package', version: '1.2.3', provision: { dummyStep: { source: 'something:1.2.3', tags } } } as any,
    state: {
      'provision.dummyStep': {
        hash: '',
        version: 1,
        artifacts: {},
      },
    },
    status: 'complete',
    miscUrl: 'file:/usecannon.com/misc',
    meta: { itsMeta: 'data' },
    options: {},
  };

  const ipfsHash = 'QmfVq9zcqjCwTMhR2VSChCbiqSK3kBrpidWtUUB3i41FyY';

  const testPkgDataIpfsUrl = 'ipfs://QmfVq9zcqjCwTMhR2VSChCbiqSK3kBrpidWtUUB3i41FyY';
  const testPkgMetaIpfsUrl = 'ipfs://QmfVq9zcqjCwTMhR2VSChCbiqSK3kBrpidWtUUB3i41FyY';

  let mockedFallBackRegistry: any;
  let localLoader: LocalLoader;
  let ipfsLoader: CliLoader;

  beforeAll(() => {
    jest.resetAllMocks();

    jest.spyOn(settings, 'resolveCliSettings').mockImplementation(
      jest.fn().mockReturnValue({
        ipfsUrl: 'http://127.0.0.1:5001',
        publishIpfsUrl: 'http://127.0.0.1:5001',
        registryRpcUrl: 'http://localhost:3000',
        registryAddress: viem.zeroAddress,
        registryChainId: '123',
        cannonDirectory: '/cannon/directory/',
      })
    );
  });

  afterEach(() => {
    mockfs.restore();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // mock cannon tag directory
    mockfs({
      '/cannon/directory/tags': {},
    });

    const cliSettings = resolveCliSettings();

    jest.spyOn(LocalLoader.prototype, 'read').mockImplementation(async (url) => {
      switch (url) {
        case 'file:/usecannon.com/misc':
          return miscData;
        case 'file:/usecannon.com/meta':
          return metaData;
        case 'file:/usecannon.com':
        case url:
          return testPkgData;
      }
      return '';
    });

    jest.spyOn(fs, 'readFile').mockImplementation((_path) => {
      const testPkgDataFilePath = path.join(cliSettings.cannonDirectory, 'tags', deployDataLocalFileName);
      switch (_path) {
        case testPkgDataFilePath:
          return Promise.resolve(Buffer.from(testPkgDataIpfsUrl));
        case testPkgDataFilePath + '.meta':
          return Promise.resolve(Buffer.from(testPkgMetaIpfsUrl));
      }
      return Promise.resolve(Buffer.from(''));
    });

    jest.spyOn(IPFSLoader.prototype, 'read').mockImplementation((url: string): Promise<any> => {
      switch (url) {
        case testPkgDataIpfsUrl:
          return Promise.resolve(testPkgData);
        case testPkgMetaIpfsUrl:
          return Promise.resolve(testPkgData.meta);
      }
      return Promise.resolve({});
    });

    jest.spyOn(CannonStorage.prototype, 'readBlob').mockImplementation((url: string): Promise<any> => {
      switch (url) {
        case testPkgDataIpfsUrl:
          return Promise.resolve(testPkgData);
        case testPkgMetaIpfsUrl:
          return Promise.resolve(testPkgData.meta);
      }
      return Promise.resolve({});
    });

    jest.spyOn(CannonStorage.prototype, 'putBlob').mockImplementation((url: string): Promise<any> => {
      switch (url) {
        case testPkgDataIpfsUrl:
          return Promise.resolve(testPkgData);
        case testPkgMetaIpfsUrl:
          return Promise.resolve(testPkgData.meta);
      }
      return Promise.resolve({});
    });

    jest.spyOn(LocalRegistry.prototype, 'getTagReferenceStorage').mockImplementation(() => {
      return path.join(cliSettings.cannonDirectory, 'tags', deployDataLocalFileName);
    });

    jest.spyOn(LocalRegistry.prototype, 'getMetaTagReferenceStorage').mockImplementation(() => {
      return path.join(cliSettings.cannonDirectory, 'tags', deployMetaDataLocalFileName);
    });

    mockedFallBackRegistry = {
      getDeployUrl: jest.fn().mockResolvedValue('file:/usecannon.com/url'),
      getUrl: jest.fn().mockResolvedValue('file:/usecannon.com/url'),
      getMetaUrl: jest.fn().mockResolvedValue('file:/usecannon.com/meta'),
    };

    localLoader = new LocalLoader('path');
    ipfsLoader = new CliLoader({
      readIpfs: new IPFSLoader('ipfs'),
      writeIpfs: undefined,
      repoLoader: new IPFSLoader('ipfs'),
      fileCacheDir: 'path',
    });

    jest.mocked(getMainLoader).mockReturnValueOnce({
      file: localLoader,
      ipfs: ipfsLoader,
    });

    jest
      .mocked(LocalRegistry.prototype.getTagReferenceStorage)
      .mockReturnValueOnce(path.join(cliSettings.cannonDirectory, 'tags', deployDataLocalFileName));
    jest
      .mocked(LocalRegistry.prototype.getMetaTagReferenceStorage)
      .mockReturnValueOnce(path.join(cliSettings.cannonDirectory, 'tags', deployMetaDataLocalFileName));

    jest.mocked(createDefaultReadRegistry).mockResolvedValue(Promise.resolve(mockedFallBackRegistry));

    jest.spyOn(localLoader, 'read').mockResolvedValue(testPkgData);
    jest.spyOn(ipfsLoader, 'read').mockResolvedValue(testPkgData);
  });

  test('should fetch package info from IPFS hash and write deployment info', async () => {
    // Call the 'fetch' function with the necessary arguments
    await fetch(basePackageRef, chainId, ipfsHash);

    expect(CannonStorage.prototype.readBlob).toHaveBeenCalledTimes(1);
  });

  test('should fail if IPFS hash is invalid', async () => {
    await expect(fetch(basePackageRef, chainId, '')).rejects.toThrowError('"" does not match the IPFS CID v0 format');
  });
});
