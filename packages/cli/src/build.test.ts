import * as paramUtils from './util/params';

import { CannonWrapperGenericProvider } from '@usecannon/builder';

const TEST_TIMEOUT = 20000;

jest.mock('ethers');
jest.mock('@usecannon/builder');

describe('build', () => {
  let cli: typeof import('./index').default;
  let helpers: typeof import('./helpers');
  let ethers: typeof import('ethers').ethers;
  let buildCommand: typeof import('./commands/build');
  let utilProvider: typeof import('./util/provider');
  beforeEach(async () => {
    // reset all mocks
    jest.clearAllMocks();
    cli = (await import('./index')).default;
    helpers = await import('./helpers');
    ethers = (await import('ethers')).ethers;
    buildCommand = await import('./commands/build');
    utilProvider = await import('./util/provider');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it(
    'should handle when cannon file is not passed, default cannonfile.toml should be used',
    async () => {
      const errorMessage = 'Reject Error';
      jest.spyOn(paramUtils, 'parseSettings').mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });
      const settings = ['first=1', 'second=2'];
      await expect(async () => {
        await cli.parseAsync(['node', 'cannon.ts', 'build', ...settings]);
      }).rejects.toThrow(errorMessage);
      expect(paramUtils.parseSettings).toHaveBeenCalledWith(settings);
    },
    TEST_TIMEOUT
  );

  it(
    'should resolve chainId from provider url',
    async () => {
      const providerUrl = 'http://localhost:8588';
      const chainId = 999;

      const getNetworkFake = jest.fn().mockResolvedValue({ chainId });
      jest.mocked(ethers.providers.JsonRpcProvider).mockImplementation(() => {
        return {
          ...jest.requireActual('ethers').providers.JsonRpcProvider,
          getNetwork: getNetworkFake,
        };
      });
      const provider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider());

      jest.spyOn(helpers, 'loadCannonfile').mockResolvedValue({} as any);
      jest.mocked(provider.getNetwork).mockResolvedValue({ chainId, name: 'dummy' });
      jest.spyOn(buildCommand, 'build').mockResolvedValue({ outputs: {}, provider });
      jest.spyOn(utilProvider, 'resolveWriteProvider').mockResolvedValue({ provider, signers: [] });

      await cli.parseAsync(['node', 'cannon.ts', 'build', '--provider-url', providerUrl]);

      // Resolved chainId from provider url
      expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledWith(providerUrl);
      expect(getNetworkFake).toHaveBeenCalledTimes(1);

      // create write provider with expected values
      expect((utilProvider.resolveWriteProvider as jest.Mock).mock.calls[0][0].providerUrl).toEqual(providerUrl);
      expect((utilProvider.resolveWriteProvider as jest.Mock).mock.calls[0][1]).toEqual(chainId);
      expect(utilProvider.resolveWriteProvider).toHaveBeenCalledTimes(1);

      // The same provider is passed to build command
      expect((buildCommand.build as jest.Mock).mock.calls[0][0].provider).toEqual(provider);
    },
    TEST_TIMEOUT
  );

  it(
    'should connect to frame with provided chainId',
    async () => {
      const chainId = 999;

      const provider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider());

      jest.spyOn(helpers, 'loadCannonfile').mockResolvedValue({} as any);
      jest.spyOn(utilProvider, 'resolveWriteProvider').mockResolvedValue({ provider, signers: [] });
      jest.spyOn(buildCommand, 'build').mockResolvedValue({ outputs: {}, provider });

      const args = ['node', 'cannon.ts', 'build', '--chain-id', String(chainId)];

      await cli.parseAsync(args);
      // create write provider with expected values
      expect((utilProvider.resolveWriteProvider as jest.Mock).mock.calls[0][0].providerUrl.split(',')[0]).toEqual('frame');
      expect((utilProvider.resolveWriteProvider as jest.Mock).mock.calls[0][1]).toEqual(String(chainId));
      expect(utilProvider.resolveWriteProvider).toHaveBeenCalledTimes(1);

      // The same provider is passed to build command
      expect((buildCommand.build as jest.Mock).mock.calls[0][0].provider).toEqual(provider);
    },
    TEST_TIMEOUT
  );
});
