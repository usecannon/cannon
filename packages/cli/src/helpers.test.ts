import * as viem from 'viem';
import { InMemoryRegistry } from '@usecannon/builder/src';
import {
  getContractsAndDetails,
  checkAndNormalizePrivateKey,
  isPrivateKey,
  getSourceFromRegistry,
  getChainId,
  getChainDataFromId,
  getChainName,
} from './helpers';
import { LocalRegistry } from './registry';
import { ChainArtifacts, FallbackRegistry } from '@usecannon/builder';

describe('getChainId', getChainIdTestCases);
describe('getChainName', getChainNameTestCases);
describe('getChainDataFromId', getChainDataFromIdTestCases);
describe('getContractsAndDetails', getContractsAndDetailsTestCases);
describe('getSourceFromLocalRegistry', getSourceFromLocalRegistryTestCases);
describe('checkAndNormalizePrivateKey', checkAndNormalizePrivateKeyTestCases);

function getChainIdTestCases() {
  it('should return the chainId for a valid chain name', () => {
    expect(getChainId('Ethereum')).toBe(1);
    expect(getChainId('Gnosis')).toBe(100);
    // expect(getChainId('Ethereum Testnet Rinkeby')).toBe(4);
    // expect(getChainId('Ethereum Testnet Kovan')).toBe(42);
    expect(getChainId('Optimism Goerli')).toBe(420);
    // expect(getChainId('Binance Smart Chain Mainnet')).toBe(56);
    expect(getChainId('Celo')).toBe(42220);
    expect(getChainId('OP Mainnet')).toBe(10);
    expect(getChainId('Sepolia')).toBe(11155111);
  });

  it('should throw an error for an invalid chain name', () => {
    expect(() => getChainId('invalid')).toThrow('Invalid chain "invalid"');
    expect(() => getChainId('unknown')).toThrow('Invalid chain "unknown"');
  });
}

function getChainDataFromIdTestCases() {
  it('should return the chain data for a valid chainId', () => {
    expect(getChainDataFromId(1)?.name).toBe('Ethereum');
    expect(getChainDataFromId(100)?.name).toBe('Gnosis');
    // expect(getChainDataFromId(3)?.name).toBe('Ethereum Testnet Ropsten');
    expect(getChainDataFromId(97)?.name).toBe('Binance Smart Chain Testnet');
    expect(getChainDataFromId(42220)?.name).toBe('Celo');
    expect(getChainDataFromId(10)?.name).toBe('OP Mainnet');
    expect(getChainDataFromId(11155111)?.name).toBe('Sepolia');
  });

  it('should return null for an invalid chainId', () => {
    expect(getChainDataFromId(999999)).toBeNull();
    expect(getChainDataFromId(0)).toBeNull();
  });
}

function getChainNameTestCases() {
  it('should return the chain name for a valid chainId', () => {
    expect(getChainName(1)).toBe('Ethereum');
    expect(getChainName(100)).toBe('Gnosis');
    // expect(getChainName(3)).toBe('Ethereum Testnet Ropsten');
    // expect(getChainName(4)).toBe('Ethereum Testnet Rinkeby');
    // expect(getChainName(42)).toBe('Ethereum Testnet Kovan');
    expect(getChainName(420)).toBe('Optimism Goerli');
    expect(getChainName(10)).toBe('OP Mainnet');
    expect(getChainName(84531)).toBe('Base Goerli');
    expect(getChainName(11155111)).toBe('Sepolia');
  });

  it('should return null for an invalid chainId', () => {
    expect(getChainName(999999)).toBe('unknown');
    expect(getChainName(0)).toBe('unknown');
  });
}

function getContractsAndDetailsTestCases() {
  it('should extract contracts and details from the state', () => {
    const state: {
      [key: string]: { artifacts: Pick<ChainArtifacts, 'contracts'> };
    } = {
      'contract.myContract1': {
        artifacts: {
          contracts: {
            Contract1: {
              address: '0xaddress1',
              abi: [],
              deployTxnHash: '0xhash1',
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
        address: '0xaddress1',
        abi: [],
        deployTxnHash: '0xhash1',
        contractName: 'Contract1',
        sourceName: 'Source1',
        deployedOn: 'date1',
        gasUsed: 1,
        gasCost: '1',
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

function checkAndNormalizePrivateKeyTestCases() {
  it('normalize and validates a single valid private key', () => {
    // Without 0x prefix
    const validPrivateKey = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    const result = checkAndNormalizePrivateKey(validPrivateKey);

    // Assuming normalizePrivateKey would return the key in a specific format, adjust accordingly
    expect(result).toBeDefined();
    expect(result!.startsWith('0x')).toBe(true);
    expect(isPrivateKey(result!)).toBe(true);
  });

  it('normalize and validates a group of private keys', () => {
    // With and without 0x prefix
    const validPrivateKeys =
      'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80,0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

    const result = checkAndNormalizePrivateKey(validPrivateKeys);

    const expectedPrivateKeys = result!.split(',') as viem.Hex[];

    // Assuming normalizePrivateKey would return the key in a specific format, adjust accordingly
    expect(result).toEqual(expectedPrivateKeys.join(','));
    expectedPrivateKeys.forEach((key) => {
      expect(key.startsWith('0x')).toBe(true);
      expect(isPrivateKey(key)).toBe(true);
    });
  });

  it('throws an error for invalid private keys', () => {
    const invalidPrivateKey = '0xdeadbeef';

    expect(() => {
      checkAndNormalizePrivateKey(invalidPrivateKey);
    }).toThrow(
      'Invalid private key found. Please verify the CANNON_PRIVATE_KEY environment variable, review your settings file, or check the value supplied to the --private-key flag'
    );
  });

  it('returns undefined for empty input', () => {
    expect(checkAndNormalizePrivateKey('')).toBeUndefined();
  });

  it('handles inputs with leading or trailing whitespace', () => {
    const validPrivateKey = ' ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 ';
    const expectedResult = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    const result = checkAndNormalizePrivateKey(validPrivateKey);

    expect(result).toEqual(expectedResult);
    expect(isPrivateKey(result!)).toBe(true);
  });
}
