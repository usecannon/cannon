import { getChainId, getChainDataFromId } from './helpers'

describe('getChainId', () => {
  it('should return the chainId for a valid chain name', () => {
    expect(getChainId('Ethereum Mainnet')).toBe(1);
    expect(getChainId('xDAI Chain')).toBe(100);
    expect(getChainId('EtherInc')).toBe(101);
    expect(getChainId('ThunderCore Mainnet')).toBe(108);
    expect(getChainId('Metadium Mainnet')).toBe(11);
    expect(getChainId('IPOS Network')).toBe(1122334455);
    expect(getChainId('Metadium Testnet')).toBe(12);
    expect(getChainId('Ropsten Testnet')).toBe(3);
    expect(getChainId('Rinkeby Testnet')).toBe(4);
    expect(getChainId('Goerli Testnet')).toBe(5);
    expect(getChainId('Kotti Testnet')).toBe(6);
    expect(getChainId('BSC Mainnet')).toBe(56);
    expect(getChainId('BSC Testnet')).toBe(97);
    expect(getChainId('Avalanche Mainnet')).toBe(43114);
    expect(getChainId('Avalanche Testnet')).toBe(43113);
    expect(getChainId('Fantom Opera')).toBe(250);
    expect(getChainId('Fantom Testnet')).toBe(4002);
    expect(getChainId('Matic Mainnet')).toBe(137);
    expect(getChainId('Matic Testnet')).toBe(80001);
    expect(getChainId('xDai')).toBe(100);
    expect(getChainId('Energy Web Chain')).toBe(246);
    expect(getChainId('Energy Web Volta')).toBe(73799);
    expect(getChainId('OKExChain Testnet')).toBe(65);
    expect(getChainId('OKExChain Mainnet')).toBe(66);
    expect(getChainId('Moonbase Alpha')).toBe(1287);
    expect(getChainId('Moonbeam Testnet')).toBe(1284);
    
    // write test cases for all chains items and getChainId with this pattern    expect(getChainId('chainName')).toBe(chainId);
    
    
  });

  it('should throw an error for an invalid chain name', () => {
    expect(() => getChainId('invalid')).toThrow('Invalid chain "invalid"');
    expect(() => getChainId('unknown')).toThrow('Invalid chain "unknown"');
  });
});

describe('getChainDataFromId', () => {
  it('should return the chain data for a valid chainId', () => {
    expect(getChainDataFromId(1)).toEqual({
      name: 'Ethereum Mainnet',
      chainId: 1,
      shortName: 'eth',
      chain: 'ETH',
      network: 'mainnet',
      networkId: 1,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpc: [
        'https://mainnet.infura.io/v3/${INFURA_API_KEY}',
        'wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}',
        'https://api.mycryptoapi.com/eth',
        'https://cloudflare-eth.com',
      ],
      etherscanApi: 'https://api.etherscan.io/api',
      etherscanUrl: 'https://etherscan.io',
      faucets: [],
      infoURL: 'https://ethereum.org',
    });
    expect(getChainDataFromId(100)).toEqual({
      name: 'xDAI Chain',
      chainId: 100,
      shortName: 'xdai',
      chain: 'XDAI',
      network: 'mainnet',
      networkId: 100,
      nativeCurrency: { name: 'xDAI', symbol: 'xDAI', decimals: 18 },
      rpc: [
        'https://rpc.xdaichain.com',
        'https://xdai.poanetwork.dev',
        'wss://rpc.xdaichain.com/wss',
        'wss://xdai.poanetwork.dev/wss',
        'http://xdai.poanetwork.dev',
        'https://dai.poa.network',
        'ws://xdai.poanetwork.dev:8546',
      ],
      etherscanApi: 'https://api.gnosisscan.io/api',
      etherscanUrl: 'https://gnosisscan.io',
      faucets: [],
      infoURL: 'https://forum.poa.network/c/xdai-chain',
    });
  });

  it('should return null for an invalid chainId', () => {
    expect(getChainDataFromId(999)).toBeNull();
    expect(getChainDataFromId(0)).toBeNull();
  });
});
