
import {ethers} from 'ethers'

const generatePrivateKey = () => {
  const randomWallet = ethers.Wallet.createRandom();
  return randomWallet.privateKey;
}

// Jest Mocking
jest.mock('../settings', () => (
  {
  resolveCliSettings: jest.fn().mockReturnValue({
    registryProviderUrl: 'http://localhost:3000',
    registryChainId: '123', // or whatever value is appropriate in your case
    privateKey: generatePrivateKey() // or whatever value is appropriate in your case
    // Add other properties as needed
  })
}

));

jest.mock('ethers', () => {
  const ethers = jest.requireActual('ethers');
  return {
    ...ethers,
    providers: {
      ...ethers.providers,
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        // Mock methods needed by your provider here...
      })),
    },
  };
});

const mockProvider = new ethers.providers.JsonRpcProvider();


jest.mock('../rpc', () => ({
  runRpc: jest.fn().mockImplementation(() => Promise.resolve({ provider: new ethers.providers.JsonRpcProvider() })),
  getProvider: jest.fn().mockImplementation(() => {
    const provider = new ethers.providers.JsonRpcProvider();
    // If you use getBalance in your code, mock it here
    provider.getBalance = jest.fn().mockResolvedValue(ethers.utils.parseEther('10'));
    return provider;
  }),

}));

jest.mock('@usecannon/builder', () => {
  const ethers = jest.requireActual('ethers');

  class CannonRegistry {
    // mock methods and properties
  }

  class CannonWrapperGenericProvider {
    provider: any;

    constructor(artifacts: any, provider: any) { // replace 'any' with the correct type if known
      this.provider = provider;
    }

    getSigner(address: string) {
      return this.provider.getSigner(address);
    }

    // Add any other methods that are used from CannonWrapperGenericProvider in your original code
  };

  return {
    CannonRegistry,
    CannonWrapperGenericProvider,
    // include other exports
  };
});


// jest.mock('../rpc');
jest.mock('@usecannon/builder');
jest.mock('lodash');

import { alter } from './alter';
import {
  CANNON_CHAIN_ID,
  DeploymentInfo,
} from '@usecannon/builder';
import { createDefaultReadRegistry } from '../registry';
import { createInitialContext, ChainDefinition, ChainBuilderRuntime, getOutputs } from '@usecannon/builder';
import Debug from 'debug';
import _ from 'lodash';
import { getProvider, runRpc } from '../rpc';
import { getMainLoader } from '../loader';
import { resolveCliSettings } from '../settings'; // Imported for 

const mockResolveCliSettings = resolveCliSettings as jest.MockedFunction<typeof resolveCliSettings>;

describe('alter', () => {
  let originalRunRpc: jest.Mock<any, any>;
  let originalCreateDefaultReadRegistry: jest.Mock<any, any>;
  let originalGetProvider: jest.Mock<any, any>;
  let originalGetMainLoader: jest.Mock<any, any>;
  let originalLodashAssign: jest.Mock<any, any>;

  beforeAll(() => {
    originalRunRpc = runRpc as jest.Mock<any, any>;
    originalCreateDefaultReadRegistry = createDefaultReadRegistry as jest.Mock<any, any>;
    originalGetProvider = getProvider as jest.Mock<any, any>;
    originalGetMainLoader = getMainLoader as jest.Mock<any, any>;
    originalLodashAssign = _.assign as jest.Mock<any, any>;

    // Mock any necessary dependencies or functions
    (runRpc as jest.Mock<any, any>).mockImplementation(() => Promise.resolve({ provider: new ethers.providers.JsonRpcProvider() }));

    (originalRunRpc as jest.Mock<any, any>).mockImplementation(() => Promise.resolve({}));
    (_.assign as jest.Mock<any, any>).mockImplementation(jest.fn());
  });

  beforeEach(() => {
    // Reset any necessary mocks or variables before each test case
    (runRpc as jest.Mock<any, any>).mockClear();
    (originalRunRpc as jest.Mock<any, any>).mockClear();
    (mockResolveCliSettings as jest.Mock<any, any>).mockClear(); // Clear mock resolveCliSettings
    (_.assign as jest.Mock<any, any>).mockClear();
  });

  test('should perform alteration for set-url command', async () => {
    // Set up test data and variables
    const packageRef = 'your-package-ref';
    const chainId = 1;
    const preset = 'your-preset';
    const meta = {};
    const command = 'set-url';
    const targets = ['target-url'];
    const runtimeOverrides = {};

    // Call the 'alter' function with the necessary arguments
    await alter(packageRef, chainId, preset, meta, command, targets, runtimeOverrides);

    // Assert the expected behavior or outcome
    // You can use jest assertions or expect statements here
    expect(runRpc as jest.Mock<any, any>).toHaveBeenCalledWith(expect.objectContaining({ port: expect.any(Number) }));
    expect(createDefaultReadRegistry as jest.Mock<any, any>).toHaveBeenCalled();
    expect(getProvider as jest.Mock<any, any>).toHaveBeenCalled();
    expect(getMainLoader as jest.Mock<any, any>).toHaveBeenCalled();
    expect(_.assign as jest.Mock<any, any>).toHaveBeenCalled();
  });

  test('should perform alteration for set-contract-address command', async () => {
    // Set up test data and variables
    const packageRef = 'your-package-ref';
    const chainId = 1;
    const preset = 'your-preset';
    const meta = {};
    const command = 'set-contract-address';
    const targets = ['target-contract-address'];
    const runtimeOverrides = {};

    // Call the 'alter' function with the necessary arguments
    await alter(packageRef, chainId, preset, meta, command, targets, runtimeOverrides);

    // Assert the expected behavior or outcome
    // You can use jest assertions or expect statements here
    expect(runRpc as jest.Mock<any, any>).toHaveBeenCalledWith(expect.objectContaining({ port: expect.any(Number) }));
    expect(createDefaultReadRegistry as jest.Mock<any, any>).toHaveBeenCalled();
    expect(getProvider as jest.Mock<any, any>).toHaveBeenCalled();
    expect(getMainLoader as jest.Mock<any, any>).toHaveBeenCalled();
    expect(_.assign as jest.Mock<any, any>).toHaveBeenCalled();
  });

  // Add more tests for the other commands like 'mark-complete' and 'mark-incomplete'
});
