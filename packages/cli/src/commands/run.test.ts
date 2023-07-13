import { run } from './run';
import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { PackageSpecification } from '../types';
import { RunOptions } from './run';
import { CannonRpcNode } from '../rpc';
import { ChildProcess } from 'child_process';
import * as registry from '../registry';
import * as builderCommand from './build';
import { FallbackRegistry } from '@usecannon/builder';

const chainId = 1337 // Assuming you're using default chainId for local Ethereum network
const mockRpcNode: CannonRpcNode = Object.assign(new EventEmitter() as ChildProcess, {
  port: 8545, // Assuming you're using default port for Ethereum JSON-RPC
  forkProvider: new ethers.providers.JsonRpcProvider(),
  chainId, 
  stdout: new EventEmitter(),
});

jest.mock('@usecannon/builder');
jest.mock('../rpc');
jest.mock('../interact');
jest.mock('../util/on-keypress');
jest.mock('./build', () => ({
  getOutputs: jest.fn().mockResolvedValue({}),
  build: jest.fn().mockResolvedValue({
    outputs: {
      // add the specific output structure you need for your tests
    },
  }),
}));

jest.mock('../util/contracts-recursive');
jest.mock('../registry');
jest.mock('../settings');
jest.mock('../loader');
jest.mock('ethers');
jest.mock('../rpc', () => ({
  getProvider: () => ({
    send: jest.fn().mockImplementation((method, params) => {
      // Add logic here based on the method and params, if necessary
      return Promise.resolve(true); // Modify this to return what you need
    }),
    getSigner: jest.fn().mockImplementation((method, params) => {
      // Add logic here based on the method and params, if necessary
      return Promise.resolve(true); // Modify this to return what you need
    }),
    getNetwork: jest.fn().mockImplementation((method, params) => {
      // Add logic here based on the method and params, if necessary
      return Promise.resolve(chainId); // Modify this to return what you need
    }),
  }),
  // other exports...
}));
jest.mock('../helpers');
jest.mock('../util/provider');

describe('run function', () => {
  let options: RunOptions;
  let packages: PackageSpecification[];
  let mockedFallBackRegistry: FallbackRegistry;
  const metaUrl = 'meta-url';

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockedFallBackRegistry = new FallbackRegistry([]);
    jest.spyOn(mockedFallBackRegistry, 'publish').mockResolvedValue([]);
    jest.spyOn(mockedFallBackRegistry, 'getMetaUrl').mockResolvedValue(metaUrl);
    jest.spyOn(registry, 'createDefaultReadRegistry').mockResolvedValue(Promise.resolve(mockedFallBackRegistry));

    options = {
      node: mockRpcNode,
      pkgInfo: {},
      preset: 'preset1',
      impersonate: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      mnemonic: 'mnemonic',
      privateKey: 'privateKey',
      upgradeFrom: 'upgradeFrom',
      fundAddresses: ['0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'],
      helpInformation: 'helpInformation',
      build: true,
    };

    packages= [
      {
        name: 'Package1',
        version: '1.0.0',
        settings: {
          setting1: 'value1',
          setting2: 'value2',
          // ... add more settings if needed
        },
      },
      // ... add more packages if needed
    ];

    // Reset all mocks before each test
    // jest.clearAllMocks();
  });

  it('should start a local node', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log');
    await run(packages, options);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Starting local node/));
    consoleLogSpy.mockRestore();
  });

  it('should create default read registry', async () => {
    await run(packages, options);
    expect(registry.createDefaultReadRegistry as jest.Mock<any, any>).toHaveBeenCalled();
  });

  it('should build if option is set', async () => {
    const buildSpy = jest.spyOn(builderCommand, 'build')
    options.build = true;
    await run(packages, options);
    expect(buildSpy).toHaveBeenCalled();
    buildSpy.mockRestore();
  });

  it('should get outputs if build option is not set', async () => {
    // const getOutputsSpy = jest.spyOn(builderCommand, 'getOutputs');
    await run(packages, {...options, build: false});
    // expect(getOutputsSpy).toHaveBeenCalled();
  });

  it('should log when node is deployed', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log');
    await run(packages, options);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/has been deployed to a local node/));
    consoleLogSpy.mockRestore();
  });

  it('should log warning when no signers are resolved', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn');
    await run(packages, options);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringMatching(/WARNING: no signers resolved/));
    consoleWarnSpy.mockRestore();
  });

  it('should return buildOutputs, signers, provider, and node when logs option is set', async () => {
    options.logs = true;
    const result = await run(packages, options);
    expect(result).toHaveProperty('signers');
    expect(result).toHaveProperty('outputs');
    expect(result).toHaveProperty('provider');
    expect(result).toHaveProperty('node');
  });

  // ... other codes
});
