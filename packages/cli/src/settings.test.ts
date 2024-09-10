import { CliSettings, resolveCliSettings, resolveCliSettingsNoCache } from './settings';

describe('settings.ts', () => {
  describe('resolveCliSettingsNoCache()', () => {
    beforeEach(() => {
      //jest.resetModules();
      process.env = {};
    });

    it('should use default values when no overrides or environment variables are provided', () => {
      const settings = resolveCliSettingsNoCache();
      expect(settings.cannonDirectory).toContain('.local/share/cannon');
      expect(settings.rpcUrl).toBe('frame,direct');
      expect(settings.ipfsTimeout).toBe(300000);
      expect(settings.ipfsRetries).toBe(3);
      expect(settings.registryPriority).toBe('onchain');
      expect(settings.quiet).toBe(false);
      expect(settings.trace).toBe(false);
    });

    it('should use environment variables when provided', () => {
      process.env.CANNON_DIRECTORY = '/custom/path';
      process.env.CANNON_RPC_URL = 'https://custom.rpc.url';
      process.env.CANNON_IPFS_TIMEOUT = '60000';
      process.env.CANNON_REGISTRY_PRIORITY = 'local';
      process.env.CANNON_QUIET = 'true';

      const settings = resolveCliSettingsNoCache();
      expect(settings.cannonDirectory).toBe('/custom/path');
      expect(settings.rpcUrl).toBe('https://custom.rpc.url');
      expect(settings.ipfsTimeout).toBe(60000);
      expect(settings.registryPriority).toBe('local');
      expect(settings.quiet).toBe(true);
    });

    it('should use overrides when provided', () => {
      const overrides = {
        rpcUrl: 'https://override.rpc.url',
        ipfsRetries: 5,
        registryPriority: 'offline' as const,
        trace: true,
      };

      const settings = resolveCliSettingsNoCache(overrides);
      expect(settings.rpcUrl).toBe('https://override.rpc.url');
      expect(settings.ipfsRetries).toBe(5);
      expect(settings.registryPriority).toBe('offline');
      expect(settings.trace).toBe(true);
    });

    it('should handle custom registry settings', () => {
      process.env.CANNON_REGISTRY_ADDRESS = '0x1234567890123456789012345678901234567890';
      process.env.CANNON_REGISTRY_RPC_URL = 'https://custom.registry.rpc';
      process.env.CANNON_REGISTRY_CHAIN_ID = '1337';

      const settings = resolveCliSettingsNoCache();
      expect(settings.registries).toEqual([
        {
          name: 'Custom Network',
          rpcUrl: ['https://custom.registry.rpc'],
          chainId: 1337,
          address: '0x1234567890123456789012345678901234567890',
        },
      ]);
    });

    it('should handle deprecated providerUrl override', () => {
      const overrides = {
        providerUrl: 'https://deprecated.provider.url',
      };

      const settings = resolveCliSettingsNoCache(overrides);
      expect(settings.rpcUrl).toBe('https://deprecated.provider.url');
    });

    it('should normalize private key', () => {
      process.env.CANNON_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      const settings = resolveCliSettingsNoCache();
      expect(settings.privateKey).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');

      process.env.CANNON_PRIVATE_KEY = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      const settings2 = resolveCliSettingsNoCache();
      expect(settings2.privateKey).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });

    it('should use CANNON_SETTINGS when provided', () => {
      const customSettings: CliSettings = {
        cannonDirectory: '/custom/cannon/directory',
        rpcUrl: 'https://custom.rpc.url',
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        ipfsTimeout: 60000,
        ipfsRetries: 10,
        ipfsUrl: 'https://custom.ipfs.url',
        writeIpfsUrl: 'https://custom.write.ipfs.url',
        publishIpfsUrl: 'https://custom.publish.ipfs.url',
        registries: [
          {
            name: 'Custom Registry',
            chainId: 1337,
            rpcUrl: ['https://custom.registry.rpc'],
            address: '0x1234567890123456789012345678901234567890',
          },
        ],
        registryPriority: 'local' as const,
        etherscanApiUrl: 'https://custom.etherscan.api',
        etherscanApiKey: 'customEtherscanApiKeyxxxxxxxxxxxxx',
        quiet: true,
        trace: false,
        isE2E: false,
      };
      process.env.CANNON_SETTINGS = JSON.stringify(customSettings);

      const settings = resolveCliSettingsNoCache();
      expect(settings).toEqual(expect.objectContaining(customSettings));

      delete process.env.CANNON_SETTINGS;
    });

    it('should prioritize environment variables over CANNON_SETTINGS', () => {
      const customSettings: Partial<CliSettings> = {
        rpcUrl: 'https://custom.rpc.url',
        ipfsRetries: 10,
      };
      process.env.CANNON_SETTINGS = JSON.stringify(customSettings);
      process.env.CANNON_RPC_URL = 'https://env.rpc.url';
      process.env.CANNON_IPFS_RETRIES = '5';

      const settings = resolveCliSettingsNoCache();
      expect(settings.rpcUrl).toBe('https://env.rpc.url');
      expect(settings.ipfsRetries).toBe(5);

      delete process.env.CANNON_SETTINGS;
      delete process.env.CANNON_RPC_URL;
      delete process.env.CANNON_IPFS_RETRIES;
    });

    it('should allow overrides to take precedence over CANNON_SETTINGS', () => {
      const customSettings: Partial<CliSettings> = {
        rpcUrl: 'https://custom.rpc.url',
        ipfsRetries: 10,
      };
      process.env.CANNON_SETTINGS = JSON.stringify(customSettings);

      const overrides = {
        rpcUrl: 'https://override.rpc.url',
        ipfsRetries: 15,
      };

      const settings = resolveCliSettingsNoCache(overrides);
      expect(settings.rpcUrl).toBe('https://override.rpc.url');
      expect(settings.ipfsRetries).toBe(15);

      delete process.env.CANNON_SETTINGS;
    });
  });

  describe('resolveCliSettings()', () => {
    // eslint-disable-next-line no-undef
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
      jest.resetModules();
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should cache the result after the first call', () => {
      const settings1 = resolveCliSettings();
      const settings2 = resolveCliSettings();

      expect(settings1).toBe(settings2);
    });

    it('should return different results when overrides are provided', () => {
      const settings1 = resolveCliSettings();

      const overrides = {
        rpcUrl: 'https://override.rpc.url',
        ipfsRetries: 10,
      };
      const settings2 = resolveCliSettings(overrides);

      expect(settings1).not.toBe(settings2);
      expect(settings1.rpcUrl).not.toBe(settings2.rpcUrl);
      expect(settings1.ipfsRetries).not.toBe(settings2.ipfsRetries);
      expect(settings2.rpcUrl).toBe('https://override.rpc.url');
      expect(settings2.ipfsRetries).toBe(10);
    });

    it('should prioritize overrides over environment variables', () => {
      process.env.CANNON_RPC_URL = 'https://env.rpc.url';

      const overrides = {
        rpcUrl: 'https://override.rpc.url',
      };
      const settings = resolveCliSettings(overrides);

      expect(settings.rpcUrl).toBe('https://override.rpc.url');
    });

    it('should use the same cached result when called with the same overrides', () => {
      const overrides = {
        rpcUrl: 'https://override.rpc.url',
      };

      const settings1 = resolveCliSettings(overrides);
      const settings2 = resolveCliSettings(overrides);

      expect(settings1).toBe(settings2);
    });

    it('should use different cached results for different overrides', () => {
      const overrides1 = {
        rpcUrl: 'https://override1.rpc.url',
      };

      const overrides2 = {
        rpcUrl: 'https://override2.rpc.url',
      };

      const settings1 = resolveCliSettings(overrides1);
      const settings2 = resolveCliSettings(overrides2);

      expect(settings1).not.toBe(settings2);
      expect(settings1.rpcUrl).toBe('https://override1.rpc.url');
      expect(settings2.rpcUrl).toBe('https://override2.rpc.url');
    });
  });
});
