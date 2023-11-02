import * as paramUtils from '../util/params';

import { CannonWrapperGenericProvider } from '@usecannon/builder';
import { CannonRpcNode } from '../rpc';

jest.mock('ethers');
jest.mock('@usecannon/builder');

describe('build', () => {
  let cli: typeof import('../index').default;
  let helpers: typeof import('../helpers');
  let ethers: typeof import('ethers').ethers;
  let buildCommand: typeof import('./build');
  let utilProvider: typeof import('../util/provider');
  let rpcModule: typeof import('../rpc');

  const fixedArgs = ['node', 'cannon.ts', 'build', '--skip-compile'];

  beforeEach(async () => {
    // reset all mocks
    jest.clearAllMocks();
    cli = (await import('../index')).default;
    helpers = await import('../helpers');
    ethers = (await import('ethers')).ethers;
    buildCommand = await import('./build');
    utilProvider = await import('../util/provider');
    rpcModule = await import('../rpc');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('should handle when cannon file is not passed, default cannonfile.toml should be used', async () => {
    const errorMessage = 'Reject Error';
    jest.spyOn(paramUtils, 'parseSettings').mockImplementationOnce(() => {
      throw new Error(errorMessage);
    });
    const settings = ['first=1', 'second=2'];
    await expect(async () => {
      await cli.parseAsync([...fixedArgs, ...settings]);
    }).rejects.toThrow(errorMessage);
    expect(paramUtils.parseSettings).toHaveBeenCalledWith(settings);
  });

  describe('provider', () => {
    let provider: CannonWrapperGenericProvider;
    beforeEach(() => {
      jest.spyOn(helpers, 'loadCannonfile').mockResolvedValue({} as any);
      provider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider());
      jest.spyOn(buildCommand, 'build').mockResolvedValue({ outputs: {}, provider });
      jest.spyOn(utilProvider, 'resolveWriteProvider').mockResolvedValue({ provider, signers: [] });
    });

    it('should resolve chainId from provider url', async () => {
      const providerUrl = 'http://localhost:8588';
      const chainId = 999;

      const getNetworkFake = jest.fn().mockResolvedValue({ chainId });
      jest.mocked(ethers.providers.JsonRpcProvider).mockImplementation(() => {
        return {
          ...jest.requireActual('ethers').providers.JsonRpcProvider,
          getNetwork: getNetworkFake,
        };
      });

      jest.mocked(provider.getNetwork).mockResolvedValue({ chainId, name: 'dummy' });

      await cli.parseAsync([...fixedArgs, '--provider-url', providerUrl]);

      // Resolved chainId from provider url
      expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledWith(providerUrl);
      expect(getNetworkFake).toHaveBeenCalledTimes(1);

      // create write provider with expected values
      expect((utilProvider.resolveWriteProvider as jest.Mock).mock.calls[0][0].providerUrl).toEqual(providerUrl);
      expect((utilProvider.resolveWriteProvider as jest.Mock).mock.calls[0][1]).toEqual(chainId);
      expect(utilProvider.resolveWriteProvider).toHaveBeenCalledTimes(1);

      // The same provider is passed to build command
      expect((buildCommand.build as jest.Mock).mock.calls[0][0].provider).toEqual(provider);
    });

    it('should connect to frame with provided chainId', async () => {
      const chainId = 999;

      const args = [...fixedArgs, '--chain-id', String(chainId)];

      await cli.parseAsync(args);
      // create write provider with expected values
      expect((utilProvider.resolveWriteProvider as jest.Mock).mock.calls[0][0].providerUrl.split(',')[0]).toEqual('frame');
      expect((utilProvider.resolveWriteProvider as jest.Mock).mock.calls[0][1]).toEqual(String(chainId));
      expect(utilProvider.resolveWriteProvider).toHaveBeenCalledTimes(1);

      // The same provider is passed to build command
      expect((buildCommand.build as jest.Mock).mock.calls[0][0].provider).toEqual(provider);
    });

    it('should run local node when no chain id and no provider url is provided', async () => {
      const cannonRpcNode: CannonRpcNode = {
        kill: () => {
          // do nothing
        },
      } as CannonRpcNode;
      jest.spyOn(rpcModule, 'runRpc').mockResolvedValue(cannonRpcNode);
      jest.spyOn(rpcModule, 'getProvider').mockReturnValue(provider);
      await cli.parseAsync(fixedArgs);

      // Create rpc node with default options
      expect(rpcModule.runRpc).toBeCalledTimes(1);
      expect(rpcModule.runRpc).toBeCalledWith({ port: 0 });

      // create provider with rpc node
      expect(rpcModule.getProvider).toBeCalledTimes(1);
      expect(rpcModule.getProvider).toBeCalledWith(cannonRpcNode);

      // The same provider is passed to build command
      expect(buildCommand.build).toBeCalledTimes(1);
      expect((buildCommand.build as jest.Mock).mock.calls[0][0].provider).toEqual(provider);
    });
  });
});
