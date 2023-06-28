import { getChainId, getChainDataFromId, getChainName } from './helpers';

describe('getChainId', getChainIdTestCases);
describe('getChainName', getChainNameTestCases);
describe('getChainDataFromId', getChainDataFromIdTestCases);

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
