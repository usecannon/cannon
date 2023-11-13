import { InMemoryRegistry } from '@usecannon/builder/src';
import { getChainId, getChainDataFromId, getChainName, getContractsAndDetails, getSourceFromRegistry } from './helpers';
import { LocalRegistry } from './registry';
import { FallbackRegistry } from '@usecannon/builder';

describe('getChainId', getChainIdTestCases);
describe('getChainName', getChainNameTestCases);
describe('getChainDataFromId', getChainDataFromIdTestCases);
describe('getContractsAndDetails', getContractsAndDetailsTestCases);
describe('getSourceFromLocalRegistry', getSourceFromLocalRegistryTestCases);

function getChainIdTestCases() {
  it('should return the chainId for a valid chain name', () => {
    expect(getChainId('Ethereum Mainnet')).toBe(1);
    expect(getChainId('xDAI Chain')).toBe(100);
    expect(getChainId('Ethereum Testnet Rinkeby')).toBe(4);
    expect(getChainId('Ethereum Testnet Kovan')).toBe(42);
    expect(getChainId('Optimistic Ethereum')).toBe(420);
    expect(getChainId('Binance Smart Chain Mainnet')).toBe(56);
    expect(getChainId('Celo')).toBe(42220);
    expect(getChainId('Optimism Mainnet')).toBe(10);
    expect(getChainId('Sepolia Network')).toBe(11155111);

    // write test cases for all chains items and getChainId with this pattern    expect(getChainId('chainName')).toBe(chainId);
  });

  it('should throw an error for an invalid chain name', () => {
    expect(() => getChainId('invalid')).toThrow('Invalid chain "invalid"');
    expect(() => getChainId('unknown')).toThrow('Invalid chain "unknown"');
  });
}

function getChainDataFromIdTestCases() {
  it('should return the chain data for a valid chainId', () => {
    expect(getChainDataFromId(1)?.name).toBe('Ethereum Mainnet');
    expect(getChainDataFromId(100)?.name).toBe('xDAI Chain');
    expect(getChainDataFromId(3)?.name).toBe('Ethereum Testnet Ropsten');
    expect(getChainDataFromId(97)?.name).toBe('Binance Smart Chain Testnet');
    expect(getChainDataFromId(42220)?.name).toBe('Celo');
    expect(getChainDataFromId(10)?.name).toBe('Optimism Mainnet');
    expect(getChainDataFromId(11155111)?.name).toBe('Ethereum Testnet Sepolia');
  });

  it('should return null for an invalid chainId', () => {
    expect(getChainDataFromId(999999)).toBeNull();
    expect(getChainDataFromId(0)).toBeNull();
  });
}

function getChainNameTestCases() {
  it('should return the chain name for a valid chainId', () => {
    expect(getChainName(1)).toBe('Ethereum Mainnet');
    expect(getChainName(100)).toBe('xDAI Chain');
    expect(getChainName(3)).toBe('Ethereum Testnet Ropsten');
    expect(getChainName(4)).toBe('Ethereum Testnet Rinkeby');
    expect(getChainName(42)).toBe('Ethereum Testnet Kovan');
    expect(getChainName(420)).toBe('Optimistic Ethereum');
    expect(getChainName(10)).toBe('Optimism Mainnet');
    expect(getChainName(84531)).toBe('Base Goerli Testnet');
    expect(getChainName(11155111)).toBe('Ethereum Testnet Sepolia');
  });

  it('should return null for an invalid chainId', () => {
    expect(getChainName(999999)).toBe('unknown');
    expect(getChainName(0)).toBe('unknown');
  });
}

function getContractsAndDetailsTestCases() {
  it('should extract contracts and details from the state', () => {
    const state = {
      'contract.myContract1': {
        artifacts: {
          contracts: {
            Contract1: {
              address: 'address1',
              abi: [],
              deployTxnHash: 'hash1',
              contractName: 'Contract1',
              sourceName: 'Source1',
              deployedOn: 'date1',
              gasUsed: 1,
              gasCost: '1',
            },
          },
        },
      },
    };
    const result = getContractsAndDetails(state);
    expect(result).toEqual({
      Contract1: {
        address: 'address1',
        abi: [],
        deployTxnHash: 'hash1',
        contractName: 'Contract1',
        sourceName: 'Source1',
        deployedOn: 'date1',
        gasUsed: 1,
        gasCost: '1'
      },
    });
  });

  it('should return an empty object if there are no contract artifacts', () => {
    const state = {};
    const result = getContractsAndDetails(state);
    expect(result).toEqual({});
  });
}

function getSourceFromLocalRegistryTestCases() {
  it('should return the source if registry present', () => {
    const mockSource = 'local';
    const localRegistryInstance = new LocalRegistry('mockPackageDir');
    const registries = [localRegistryInstance];
    const result = getSourceFromRegistry(registries);

    expect(result).toBe(mockSource);
  });

  it('should return the source of registry in use when mixed with other registries', () => {
    const mockSource = 'memory';
    const localRegistryInstance = new LocalRegistry('mockPackageDir');
    const fallbackRegistryInstance1 = new FallbackRegistry([new InMemoryRegistry()]);
    const fallbackRegistryInstance2 = new FallbackRegistry([]);
    const registries = [fallbackRegistryInstance1, localRegistryInstance, fallbackRegistryInstance2];
    const result = getSourceFromRegistry(registries);

    expect(result).toBe(mockSource);
  });
}
