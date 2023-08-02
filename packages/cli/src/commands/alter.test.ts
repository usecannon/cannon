import { ethers } from 'ethers';
import { alter } from './alter';
import { createDefaultReadRegistry } from '../registry';
import { CannonStorage, ChainDefinition, DeploymentInfo, FallbackRegistry, IPFSLoader } from '@usecannon/builder';
import { getMainLoader, LocalLoader } from '../loader';
import _ from 'lodash';
import cli from '../index';

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
  const packageName = 'package:1.2.3';
  const chainId = 123;
  const preset = 'your-preset';
  const runtimeOverrides = {};
  const metaUrl = 'meta-url';
  const url = 'file:/usecannon.com/url';
  const newUrl = 'file:/usecannon.com/new-url';
  let testPkgData: DeploymentInfo;
  let localLoader: LocalLoader;
  let ipfsLoader: IPFSLoader;
  let mockedFallBackRegistry: FallbackRegistry;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    localLoader = new LocalLoader('path');
    ipfsLoader = new IPFSLoader('ipfs');
    mockedFallBackRegistry = new FallbackRegistry([]);
    testPkgData = {
      def: { name: 'package', version: '1.2.3', provision: { dummyStep: { tags: ['tag3', 'tag4'] } } } as any,
      state: {
        'provision.dummyStep': {
          hash: '',
          version: 1,
          artifacts: {
            contracts: {
              TestContract: {
                address: '0x1111111111111111111111111111111111111111',
                abi: [],
                deployTxnHash: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                contractName: 'TestContract',
                sourceName: 'TestContract.sol',
                deployedOn: '',
              },
            },
          },
        },
      },
      status: 'complete',
      miscUrl: 'file:/usecannon.com/misc',
      meta: {},
      options: {},
    };
    jest.spyOn(mockedFallBackRegistry, 'publish').mockResolvedValue([]);
    jest.spyOn(mockedFallBackRegistry, 'getMetaUrl').mockResolvedValue(metaUrl);
    jest.spyOn(CannonStorage.prototype, 'readDeploy').mockResolvedValue(testPkgData);
    jest.spyOn(CannonStorage.prototype, 'putDeploy').mockResolvedValue(newUrl);
    jest.mocked(createDefaultReadRegistry).mockResolvedValue(Promise.resolve(mockedFallBackRegistry));
    jest.mocked(getMainLoader).mockReturnValueOnce({
      file: localLoader,
      ipfs: ipfsLoader,
    });
  });

  test('should perform alteration for set-url command', async () => {
    // Set up test data and variables
    const command = 'set-url';
    const targets = [url];

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

    jest.spyOn(localLoader, 'read').mockImplementation(mockReadDeploy);

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
  });

  test('should perform alteration for set-contract-address command', async () => {
    // Set up test data and variables
    const command = 'set-contract-address';
    const targets = ['TestContract', '0x2222222222222222222222222222222222222222'];

    // Call the 'alter' function with the necessary arguments
    await alter(packageName, chainId, preset, testPkgData.meta, command, targets, runtimeOverrides);

    expect(CannonStorage.prototype.readDeploy as jest.Mock<any, any>).toHaveBeenCalledWith(packageName, preset, chainId);
    expect(CannonStorage.prototype.putDeploy as jest.Mock<any, any>).toHaveBeenCalledWith(testPkgData);
    expect(testPkgData.state['provision.dummyStep'].artifacts.contracts!.TestContract.address).toEqual(targets[1]);
    expect(mockedFallBackRegistry.publish as jest.Mock<any, any>).toHaveBeenCalledWith(
      [packageName],
      `${chainId}-${preset}`,
      newUrl,
      metaUrl
    );
  });

  it('should perform alteration for mark-complete', async () => {
    const command = 'mark-complete';
    const targets = ['provision.dummyStep'];
    const hash = '0xmark-complete-fffffffffffffffffffffffffffffffffffffffffffffffff';
    jest.spyOn(ChainDefinition.prototype, 'getState').mockResolvedValue(hash);

    // Call the 'alter' function with the necessary arguments
    await alter(packageName, chainId, preset, testPkgData.meta, command, targets, runtimeOverrides);

    expect(CannonStorage.prototype.readDeploy as jest.Mock<any, any>).toHaveBeenCalledWith(packageName, preset, chainId);
    expect(CannonStorage.prototype.putDeploy as jest.Mock<any, any>).toHaveBeenCalledWith(testPkgData);

    // TODO: I am not sure the package status must be changed to another value
    // expect(testPkgData.status).toEqual('complete');
    expect(testPkgData.state['provision.dummyStep'].hash).toEqual(hash);
    expect(mockedFallBackRegistry.publish as jest.Mock<any, any>).toHaveBeenCalledWith(
      [packageName],
      `${chainId}-${preset}`,
      newUrl,
      metaUrl
    );
  });

  it('should perform alteration for mark-incomplete', async () => {
    // Set up test data and variables
    const command = 'mark-incomplete';
    const targets = ['provision.dummyStep'];

    // Call the 'alter' function with the necessary arguments
    await alter(packageName, chainId, preset, testPkgData.meta, command, targets, runtimeOverrides);

    expect(CannonStorage.prototype.readDeploy as jest.Mock<any, any>).toHaveBeenCalledWith(packageName, preset, chainId);
    expect(CannonStorage.prototype.putDeploy as jest.Mock<any, any>).toHaveBeenCalledWith(testPkgData);

    // TODO: I am not sure the package status must be changed to another value
    // expect(testPkgData.status).toEqual('incomplete');
    expect(testPkgData.state['provision.dummyStep'].hash).toEqual('INCOMPLETE');
    expect(mockedFallBackRegistry.publish as jest.Mock<any, any>).toHaveBeenCalledWith(
      [packageName],
      `${chainId}-${preset}`,
      newUrl,
      metaUrl
    );
  });

  test('should perform alteration for set-contract-address command - cli', async () => {
    // Set up test data and variables
    const command = 'set-contract-address';
    const targets: string[] = ['TestContract', '0x2222222222222222222222222222222222222222'];

    // Call the 'alter' function with the necessary arguments
    // await alter(packageName, chainId, preset, testPkgData.meta, command, targets, runtimeOverrides);

    await cli.parseAsync([
      'node',
      'cannon.ts',
      'alter',
      packageName,
      command,
      ...targets,
      '-c',
      String(chainId),
      '-p',
      preset,
    ]);

    expect(CannonStorage.prototype.readDeploy as jest.Mock<any, any>).toHaveBeenCalledWith(
      packageName,
      preset,
      String(chainId)
    );
    expect(CannonStorage.prototype.putDeploy as jest.Mock<any, any>).toHaveBeenCalledWith(testPkgData);
    expect(testPkgData.state['provision.dummyStep'].artifacts.contracts!.TestContract.address).toEqual(targets[1]);
    expect(mockedFallBackRegistry.publish as jest.Mock<any, any>).toHaveBeenCalledWith(
      [packageName],
      `${chainId}-${preset}`,
      newUrl,
      metaUrl
    );
  });
});
