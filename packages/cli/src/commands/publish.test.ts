import {
  CannonWrapperGenericProvider,
  publishPackage,
  DeploymentInfo,
  IPFSLoader,
  OnChainRegistry,
} from '@usecannon/builder';
import * as builder from '@usecannon/builder';
import { LocalLoader } from '../loader';
import { publish } from '../commands/publish';
import { ethers } from 'ethers';
import fs from 'fs-extra';
import path from 'path';
import { resolveCliSettings } from '../settings';
import * as settings from '../settings';
import _ from 'lodash';

describe('publish command', () => {
  let tags = ['tag0', 'tag1'];
  const chainId = 123;
  const otherChainId = 1234;
  const preset = 'your-preset';
  const packageRef = `package:1.2.3@${preset}`;
  const basePackageRef = 'package:1.2.3';
  const otherPreset = 'other-preset';
  let signer: ethers.Signer;
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

  const testPkgDataIpfsUrl = 'ipfs:/test-ipfs-url';
  const testPkgDataNewIpfsUrl = 'ipfs:/test-ipfs-new-url';
  const testPkgMetaIpfsUrl = 'ipfs:/test-ipfs-meta-url';
  const testPkgMiscIpfsUrl = 'ipfs:/test-ipfs-misc-url';
  const testPkgNewMetaIpfsUrl = 'ipfs:/test-ipfs-new-meta-url';

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

    signer = ethers.Wallet.createRandom().connect(
      new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider())
    );
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // @ts-ignore
    jest.spyOn(fs, 'readdir').mockResolvedValue([deployDataLocalFileName, deployDataLocalFileName + '.meta']);

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

    jest.spyOn(OnChainRegistry.prototype, 'publishMany').mockResolvedValue([]);
  });

  it('should publish the package to the registry', async () => {
    // jest spy on fs readdir which return string[] of package.json
    await publish({
      packageRef: basePackageRef,
      signer,
      tags,
      chainId,
      quiet: true,
      overrides: {},
    });

    expect(OnChainRegistry.prototype.publishMany as jest.Mock).toHaveBeenCalledTimes(1);
    expect(OnChainRegistry.prototype.publishMany as jest.Mock).toHaveBeenCalledWith([
      {
        packagesNames: [basePackageRef, ...tags.map((tag) => 'package:' + tag)],
        variant: `${chainId}-${preset}`,
        url: testPkgDataNewIpfsUrl,
        metaUrl: testPkgNewMetaIpfsUrl,
      },
    ]);
  });

  it('should publish the package to the registry with no tags', async () => {
    tags = [];
    await publish({
      packageRef: basePackageRef,
      signer,
      tags,
      chainId,
      quiet: true,
      includeProvisioned: true,
      overrides: {},
    });

    expect(OnChainRegistry.prototype.publishMany as jest.Mock).toHaveBeenCalledTimes(1);
    // the first call to publishMany first argument has a property packagesNames which is an array of strings
    // the first element is the package name and the rest are the tags
    expect((OnChainRegistry.prototype.publishMany as jest.Mock).mock.calls[0][0][0].packagesNames).toEqual([basePackageRef]);
  });

  describe('scanDeploys', () => {
    beforeEach(() => {
      const nonSenseFileName = 'nonSenseFileName.txt';
      const _deployDataLocalFileNames = [
        `${basePackageRef.replace(':', '_')}_${chainId}-${preset}.txt`,
        `${basePackageRef.replace(':', '_')}_${chainId}-${otherPreset}.txt`,
        `${basePackageRef.replace(':', '_')}_${otherChainId}-${preset}.txt`,
        nonSenseFileName,
      ];
      // @ts-ignore
      jest.spyOn(fs, 'readdir').mockResolvedValue(_deployDataLocalFileNames);
      jest.spyOn(builder, 'publishPackage').mockImplementation(async () => {
        return [];
      });
    });

    it('should only find single deploy file on chainId and preset set', async () => {
      await publish({
        packageRef: packageRef,
        signer,
        tags,
        chainId,
        quiet: true,
        includeProvisioned: true,
        overrides: {},
      });

      expect(publishPackage as jest.Mock).toHaveBeenCalledTimes(1);
      expect((publishPackage as jest.Mock).mock.calls[0][0].packageRef).toEqual(basePackageRef);
      expect((publishPackage as jest.Mock).mock.calls[0][0].variant).toEqual(`${chainId}-${preset}`);
    });

    // Not sure if it's the expected behavior to match multiple deploy files on preset is empty
    // But it's the current implementation
    it('should find multiple deploy files on chainId set', async () => {
      await publish({
        packageRef: basePackageRef,
        signer,
        tags,
        chainId,
        presetArg: '',
        quiet: true,
        overrides: {},
      });

      expect(publishPackage as jest.Mock).toHaveBeenCalledTimes(2);
      expect((publishPackage as jest.Mock).mock.calls[0][0].packageRef).toEqual(basePackageRef);
      expect((publishPackage as jest.Mock).mock.calls[0][0].variant).toEqual(`${chainId}-${preset}`);
      expect((publishPackage as jest.Mock).mock.calls[1][0].packageRef).toEqual(basePackageRef);
      expect((publishPackage as jest.Mock).mock.calls[1][0].variant).toEqual(`${chainId}-${otherPreset}`);
    });

    // Not sure if it's the expected behavior to match multiple deploy files on chainId is zero
    // But it's the current implementation
    it('should find multiple deploy files on preset set', async () => {
      await publish({
        packageRef: basePackageRef,
        signer,
        tags,
        chainId: 0,
        presetArg: preset,
        quiet: true,
        overrides: {},
      });

      expect(publishPackage as jest.Mock).toHaveBeenCalledTimes(2);
      expect((publishPackage as jest.Mock).mock.calls[0][0].packageRef).toEqual(basePackageRef);
      expect((publishPackage as jest.Mock).mock.calls[0][0].variant).toEqual(`${chainId}-${preset}`);
      expect((publishPackage as jest.Mock).mock.calls[1][0].packageRef).toEqual(basePackageRef);
      expect((publishPackage as jest.Mock).mock.calls[1][0].variant).toEqual(`${otherChainId}-${preset}`);
    });
  });
});
