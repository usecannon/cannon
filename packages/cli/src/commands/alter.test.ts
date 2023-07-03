import { ethers } from 'ethers';
import { alter } from './alter';
import { runRpc } from '../rpc';
import { createDefaultReadRegistry } from '../registry';
import { CannonStorage, DeploymentInfo, FallbackRegistry, IPFSLoader } from '@usecannon/builder';
import { getMainLoader, LocalLoader } from '../loader';
import _ from 'lodash';

function generatePrivateKey(): string {
  const randomWallet = ethers.Wallet.createRandom();
  return randomWallet.privateKey;
}

// Jest Mocking
jest.mock('../settings', () => ({
  resolveCliSettings: jest.fn().mockReturnValue({
    registryProviderUrl: 'http://localhost:3000',
    registryChainId: '123', // or whatever value is appropriate in your case
    privateKey: generatePrivateKey(), // or whatever value is appropriate in your case
    // Add other properties as needed
  }),
}));

jest.mock('../registry');
// jest.mock('@usecannon/builder');
jest.mock('../loader');

jest.mock('../rpc');

describe('alter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should perform alteration for set-url command', async () => {
    // Set up test data and variables
    const packageName = 'package:1.2.3';
    const chainId = 123;
    const preset = 'your-preset';
    const command = 'set-url';
    const url = 'file:/usecannon.com/url';
    const newUrl = 'file:/usecannon.com/new-url';
    const metaUrl = 'meta-url';
    const targets = [url];
    const runtimeOverrides = {};

    const localLoader = new LocalLoader('path');
    const ipfsLoader = new IPFSLoader('ipfs');
    const mockedFallBackRegistry = new FallbackRegistry([]);

    jest.spyOn(mockedFallBackRegistry, 'publish').mockResolvedValue([]);

    jest.mocked(createDefaultReadRegistry).mockResolvedValue(Promise.resolve(mockedFallBackRegistry));
    jest.mocked(getMainLoader).mockReturnValueOnce({
      file: localLoader,
      ipfs: ipfsLoader,
    });
    jest.spyOn(mockedFallBackRegistry, 'getMetaUrl').mockResolvedValue(metaUrl);
    const testPkgData: DeploymentInfo = {
      def: { name: 'package', version: '1.2.3', provision: { dummyStep: { tags: ['tag3', 'tag4'] } } } as any,
      state: {
        'provision.dummyStep': {
          hash: '',
          version: 1,
          artifacts: {},
        },
      },
      status: 'complete',
      miscUrl: 'file:/usecannon.com/misc',
      meta: {},
      options: {},
    };

    const newTestPkgData: DeploymentInfo = _.assign(testPkgData, {
      miscUrl: 'file:/usecannon.com/new-misc',
    });

    const mockReadDeploy = jest.fn(async (url) => {
      switch (url) {
        case 'file:/usecannon.com/misc':
          return { misc: 'info' };
        case 'file:/usecannon.com/meta':
          return { itsMeta: 'data' };
        case 'file:/usecannon.com':
          return testPkgData;
        case url:
          return testPkgData;
        case newUrl:
          return newTestPkgData;
      }
    });

    jest.spyOn(CannonStorage.prototype, 'readDeploy').mockResolvedValue(testPkgData);
    jest.spyOn(CannonStorage.prototype, 'putDeploy').mockResolvedValue(newUrl);
    jest.spyOn(localLoader, 'read').mockImplementation(mockReadDeploy);
    jest.spyOn(ipfsLoader, 'put').mockResolvedValue(newUrl);

    // Call the 'alter' function with the necessary arguments
    await alter(packageName, chainId, preset, testPkgData.meta, command, targets, runtimeOverrides);

    expect(CannonStorage.prototype.readDeploy as jest.Mock<any, any>).toHaveBeenCalledWith(packageName, preset, chainId);
    expect(CannonStorage.prototype.putDeploy as jest.Mock<any, any>).toHaveBeenCalledWith(newTestPkgData);
    expect(mockedFallBackRegistry.publish as jest.Mock<any, any>).toHaveBeenCalledWith(
      [packageName],
      `${chainId}-${preset}`,
      newUrl,
      metaUrl
    );

    expect(runRpc as jest.Mock<any, any>).toHaveBeenCalledWith(expect.objectContaining({ port: expect.any(Number) }));
  });

  // test('should perform alteration for set-contract-address command', async () => {
  //   // Set up test data and variables
  //   const packageRef = 'your-package-ref';
  //   const chainId = 1;
  //   const preset = 'your-preset';
  //   const meta = {};
  //   const command = 'set-contract-address';
  //   const targets = ['target-contract-address'];
  //   const runtimeOverrides = {};
  //
  //   // Call the 'alter' function with the necessary arguments
  //   await alter(packageRef, chainId, preset, meta, command, targets, runtimeOverrides);
  //
  //   // Assert the expected behavior or outcome
  //   // You can use jest assertions or expect statements here
  //   expect(runRpc as jest.Mock<any, any>).toHaveBeenCalledWith(expect.objectContaining({ port: expect.any(Number) }));
  //   expect(createDefaultReadRegistry as jest.Mock<any, any>).toHaveBeenCalled();
  //   expect(getProvider as jest.Mock<any, any>).toHaveBeenCalled();
  //   expect(getMainLoader as jest.Mock<any, any>).toHaveBeenCalled();
  //   expect(_.assign as jest.Mock<any, any>).toHaveBeenCalled();
  // });
  //
  // Add more tests for the other commands like 'mark-complete' and 'mark-incomplete'
});
