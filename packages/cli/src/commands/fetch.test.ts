import _ from 'lodash';
import fs from 'node:fs';
import path from 'node:path';
import { ethers } from 'ethers';

import { CannonStorage } from '@usecannon/builder';
import { createDefaultReadRegistry, LocalRegistry } from '../registry';
import * as settings from '../settings';
import { resolveCliSettings } from '../settings';
import { fetch } from './fetch';

import { getMainLoader, LocalLoader } from '../loader';
import { DeploymentInfo, IPFSLoader } from '@usecannon/builder';

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
  const testPkgDataNewIpfsUrl = 'ipfs://QmfVq9zcqjCwTMhR2VSChCbiqSK3kBrpidWtUUB3i41FyY';
  const testPkgMetaIpfsUrl = 'ipfs://QmfVq9zcqjCwTMhR2VSChCbiqSK3kBrpidWtUUB3i41FyY';
  const testPkgMiscIpfsUrl = 'ipfs://QmfVq9zcqjCwTMhR2VSChCbiqSK3kBrpidWtUUB3i41FyY';
  const testPkgNewMetaIpfsUrl = 'ipfs://QmfVq9zcqjCwTMhR2VSChCbiqSK3kBrpidWtUUB3i41FyY';

  let mockedFallBackRegistry: any;
  let localLoader: LocalLoader;
  let ipfsLoader: IPFSLoader;

  beforeAll(async () => {
    jest.resetAllMocks();

    jest.spyOn(settings, 'resolveCliSettings').mockImplementation(
      jest.fn().mockReturnValue({
        ipfsUrl: 'http://127.0.0.1:5001',
        publishIpfsUrl: 'http://127.0.0.1:5001',
        registryProviderUrl: 'http://localhost:3000',
        registryAddress: ethers.constants.AddressZero,
        registryChainId: '123', // or whatever value is appropriate in your case
        cannonDirectory: '/cannon/directory/',
        // Add other properties as needed
      })
    );
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

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

    jest.spyOn(IPFSLoader.prototype, 'put').mockImplementation(async (data: any) => {
      if (_.isEqual(data, miscData)) {
        return testPkgMiscIpfsUrl;
      } else if (_.isEqual(data, metaData)) {
        return testPkgNewMetaIpfsUrl;
      } else if (_.isEqual(data, _.assign(testPkgData, { miscUrl: testPkgMiscIpfsUrl }))) {
        return testPkgDataNewIpfsUrl;
      }
      return '';
    });

    jest.spyOn(LocalRegistry.prototype, 'getTagReferenceStorage').mockImplementation(() => {
      return path.join(cliSettings.cannonDirectory, 'tags', deployDataLocalFileName);
    });

    mockedFallBackRegistry = {
      getDeployUrl: jest.fn().mockResolvedValue('file:/usecannon.com/url'),
      getUrl: jest.fn().mockResolvedValue('file:/usecannon.com/url'),
      getMetaUrl: jest.fn().mockResolvedValue('file:/usecannon.com/meta'),
    };

    localLoader = new LocalLoader('path');
    ipfsLoader = new IPFSLoader('ipfs');

    jest.mocked(getMainLoader).mockReturnValueOnce({
      file: localLoader,
      ipfs: ipfsLoader,
    });

    jest.mocked(LocalRegistry.prototype.getTagReferenceStorage).mockReturnValueOnce('/cannon/directory/tags/');

    jest.mocked(createDefaultReadRegistry).mockResolvedValue(Promise.resolve(mockedFallBackRegistry));

    jest.mock('../settings', () => ({
      resolveCliSettings: jest.fn().mockReturnValue({}),
    }));
    jest.spyOn(localLoader, 'read').mockResolvedValue(testPkgData);
    jest.spyOn(ipfsLoader, 'read').mockResolvedValue(testPkgData);
  });

  test('should fetch package info from IPFS hash', async () => {
    // Call the 'fetch' function with the necessary arguments
    await fetch(basePackageRef, ipfsHash);

    expect(CannonStorage.prototype.readBlob).toHaveBeenCalledTimes(1);
    expect(CannonStorage.prototype.putBlob).toHaveBeenCalledTimes(1);
  });

  test('should fetch package meta info from IPFS hash', async () => {
    // Call the 'fetch' function with the necessary arguments
    await fetch(basePackageRef, ipfsHash);

    expect(CannonStorage.prototype.readBlob).toHaveBeenCalledTimes(1);
    expect(CannonStorage.prototype.putBlob).toHaveBeenCalledTimes(1);
  });

  test('should fail to fetch if IPFS hash is invalid', async () => {
    await expect(fetch(basePackageRef, '')).rejects.toThrowError('"" does not match the IPFS CID v0 format');
  });
});
