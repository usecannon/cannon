import { hideApiKey } from './provider'; // Replace with the actual file name

describe('hideApiKey', () => {
  test('should mask llamanodes api token', () => {
    const url = 'https://eth.llamarpc.com/sk_llama_3b8dcfb486797e66de26feef7df7do55';
    const result = hideApiKey(url);
    expect(result).toBe('https://eth.llamarpc.com/*************************************do55');
  });

  test('should mask tenderly api token', () => {
    const url = 'https://base.gateway.tenderly.co/76zCIaEVWnjMIiV2gLWxKz';
    const result = hideApiKey(url);
    expect(result).toBe('https://base.gateway.tenderly.co/******************WxKz');
  });

  test('should mask alchemy api token', () => {
    const url = 'https://base-mainnet.g.alchemy.com/v2/eqWTQfGELVeoF-igh22LXta1JDVY0kKD';
    const result = hideApiKey(url);
    expect(result).toBe('https://base-mainnet.g.alchemy.com/v2/****************************0kKD');
  });

  test('should mask infura api token', () => {
    const url = 'https://arbitrum-mainnet.infura.io/v3/099fc55e0de9251d80b18d7c74caa7c7';
    const result = hideApiKey(url);
    expect(result).toBe('https://arbitrum-mainnet.infura.io/v3/****************************a7c7');
  });

  test('should return original URL for invalid URLs', () => {
    const url = 'not a valid url';
    const result = hideApiKey(url);
    expect(result).toBe('not a valid url');
  });
});
