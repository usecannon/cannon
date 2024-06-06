import {
  CannonStorage,
  DeploymentInfo,
  InMemoryRegistry,
  IPFSLoader,
  OnChainRegistry,
  preparePublishPackage,
} from '@usecannon/builder';
import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import { dirSync } from 'tmp-promise';
import * as viem from 'viem';
import { publish } from '../commands/publish';
import { LocalLoader } from '../loader';
import { resolveCliSettings } from '../settings';

describe('publish command', () => {
  let tags = ['tag0', 'tag1'];
  const chainId = 123;
  const otherChainId = 1234;
  const preset = 'main';
  const fullPackageRef = `package:1.2.3@${preset}`;
  const basePackageRef = 'package:1.2.3';
  const otherPreset = 'other';
  let onChainRegistry: InMemoryRegistry;
  const deployDataLocalFileName = `${basePackageRef.replace(':', '_')}_${chainId}-${preset}.txt`;
  const deployDataLocalFileNameLatest = `package_latest_${chainId}-${preset}.txt`;
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
    miscUrl: 'file://usecannon.com/misc',
    meta: { itsMeta: 'data' },
    options: {},
  };

  const testPkgDataIpfsUrl = 'ipfs://test-ipfs-url';
  const testPkgDataNewIpfsUrl = 'ipfs://test-ipfs-new-url';
  const testPkgMetaIpfsUrl = 'ipfs://test-ipfs-meta-url';
  const testPkgMiscIpfsUrl = 'ipfs://test-ipfs-misc-url';
  const testPkgNewMetaIpfsUrl = 'ipfs://test-ipfs-new-meta-url';

  beforeAll(async () => {
    jest.resetAllMocks();

    const settings = await import('../settings');
    jest.spyOn(settings, 'resolveCliSettings').mockImplementation(
      jest.fn().mockReturnValue({
        ipfsUrl: 'http://127.0.0.1:5001',
        publishIpfsUrl: 'http://127.0.0.1:5001',
        registryProviderUrl: 'http://localhost:3000',
        registryAddress: viem.zeroAddress,
        registryChainId: '123', // or whatever value is appropriate in your case
        cannonDirectory: dirSync().name,
        // Add other properties as needed
      })
    );

    onChainRegistry = new InMemoryRegistry();
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // @ts-ignore
    jest.spyOn(fs, 'readdir').mockResolvedValue([
      deployDataLocalFileName,
      deployDataLocalFileName + '.meta',
      deployDataLocalFileNameLatest,
      deployDataLocalFileNameLatest + '.meta',
      // casting to as never here because the types for fs-extra seem to be borked up atm (they partially inherit from node types, which breaks everything)
    ] as never);

    const cliSettings = resolveCliSettings();

    jest.spyOn(LocalLoader.prototype, 'read').mockImplementation(async (url) => {
      switch (url) {
        case 'file://usecannon.com/misc':
          return miscData;
        case 'file://usecannon.com/meta':
          return metaData;
        case 'file://usecannon.com':
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

    jest.spyOn(CannonStorage.prototype, 'readDeploy').mockResolvedValue(testPkgData);
    jest.spyOn(OnChainRegistry.prototype, 'publishMany').mockResolvedValue([]);
    jest.spyOn(OnChainRegistry.prototype, 'publish').mockResolvedValue([]);
  });

  it('should publish the package to the registry', async () => {
    // jest spy on fs readdir which return string[] of package.json
    await publish({
      packageRef: fullPackageRef,
      cliSettings: resolveCliSettings(),
      onChainRegistry,
      tags,
      chainId,
      quiet: true,
      includeProvisioned: false,
      skipConfirm: true,
    });

    expect(await onChainRegistry.getUrl(fullPackageRef, chainId)).toEqual(testPkgDataNewIpfsUrl);
    expect(await onChainRegistry.getUrl(`package:tag0@${preset}`, chainId)).toEqual(testPkgDataNewIpfsUrl);
  });

  it('should publish the package to the registry with no tags', async () => {
    tags = [];
    await publish({
      packageRef: fullPackageRef,
      cliSettings: resolveCliSettings(),
      onChainRegistry,
      tags,
      chainId,
      quiet: true,
      skipConfirm: true,
      includeProvisioned: true,
    });

    expect(await onChainRegistry.getUrl(fullPackageRef, chainId)).toEqual(testPkgDataNewIpfsUrl);
  });

  describe('scanDeploys', () => {
    beforeEach(async () => {
      const _deployDataLocalFileNames = [
        `${basePackageRef.replace(':', '_')}_${chainId}-${preset}.txt`,
        `${basePackageRef.replace(':', '_')}_${chainId}-${otherPreset}.txt`,
        `${basePackageRef.replace(':', '_')}_${otherChainId}-${preset}.txt`,
      ];
      // @ts-ignore
      jest.spyOn(fs, 'readdir').mockResolvedValue(_deployDataLocalFileNames);

      const builder = await import('@usecannon/builder');
      jest.spyOn(builder, 'preparePublishPackage').mockImplementation(async () => {
        return [];
      });
    });

    it('should only find single deploy file on chainId and preset set', async () => {
      await publish({
        packageRef: fullPackageRef,
        cliSettings: resolveCliSettings(),
        onChainRegistry,
        tags,
        chainId,
        quiet: true,
        skipConfirm: true,
        includeProvisioned: true,
      });

      expect(preparePublishPackage as jest.Mock).toHaveBeenCalledTimes(1);
      expect((preparePublishPackage as jest.Mock).mock.calls[0][0].packageRef).toEqual(fullPackageRef);
      expect((preparePublishPackage as jest.Mock).mock.calls[0][0].chainId).toEqual(chainId);
    });

    // Not sure if it's the expected behavior to match multiple deploy files on preset is empty
    // But it's the current implementation
    it('should find multiple deploy files on chainId set', async () => {
      await publish({
        packageRef: fullPackageRef,
        cliSettings: resolveCliSettings(),
        onChainRegistry,
        tags,
        chainId,
        presetArg: '',
        quiet: true,
        skipConfirm: true,
      });

      expect(preparePublishPackage as jest.Mock).toHaveBeenCalledTimes(1);
      expect((preparePublishPackage as jest.Mock).mock.calls[0][0].packageRef).toEqual(fullPackageRef);
      expect((preparePublishPackage as jest.Mock).mock.calls[0][0].chainId).toEqual(chainId);
    });

    // Not sure if it's the expected behavior to match multiple deploy files on chainId is zero
    // But it's the current implementation
    it('should find multiple deploy files on preset set', async () => {
      await publish({
        packageRef: fullPackageRef,
        cliSettings: resolveCliSettings(),
        onChainRegistry,
        tags,
        chainId: 0,
        presetArg: preset,
        quiet: true,
        skipConfirm: true,
      });

      expect(preparePublishPackage as jest.Mock).toHaveBeenCalledTimes(1);
      expect((preparePublishPackage as jest.Mock).mock.calls[0][0].packageRef).toEqual(fullPackageRef);
      expect((preparePublishPackage as jest.Mock).mock.calls[0][0].chainId).toEqual(chainId);
    });
  });
});
