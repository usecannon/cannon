import * as viem from 'viem';
import { CannonRpcNode, runRpc } from '../rpc';

jest.mock('ethers');
jest.mock('@usecannon/builder');

export function makeFakeProvider(): viem.PublicClient & viem.WalletClient & viem.TestClient {
  const fakeProvider = viem
    .createTestClient({
      mode: 'anvil',
      transport: viem.http('http://localhost:8588'),
      chain: viem.defineChain({
        id: 999,
        name: 'test',
        nativeCurrency: {
          decimals: 18,
          name: 'Ether',
          symbol: 'ETH',
        },
        rpcUrls: {
          default: {
            http: [''],
            webSocket: [''],
          },
        },
        blockExplorers: {
          default: { name: 'test', url: '' },
        },
      }),
    })
    .extend(viem.publicActions)
    .extend(viem.walletActions);

  for (const p in fakeProvider) {
    if ((typeof (fakeProvider as any)[p] as any) === 'function') {
      (fakeProvider as any)[p] = jest.fn();
    }
  }

  return fakeProvider as any;
}

describe('build', () => {
  let cli: typeof import('../index').default;
  let helpers: typeof import('../helpers');
  let buildCommand: typeof import('./build');
  let doBuild: typeof import('../util/build');
  let utilProvider: typeof import('../util/provider');
  let rpcModule: typeof import('../rpc');

  const fixedArgs = ['node', 'cannon.ts', 'build', '--skip-compile'];

  beforeEach(async () => {
    // reset all mocks
    jest.clearAllMocks();
    cli = (await import('../index')).default;
    helpers = await import('../helpers');
    buildCommand = await import('./build');
    doBuild = await import('../util/build');
    utilProvider = await import('../util/provider');
    rpcModule = await import('../rpc');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('onBuild', () => {
    it('should handle when cannon file is not passed, default cannonfile.toml should be used', async () => {
      let cannonfile = '';
      const settings = ['first=1', 'second=2'];

      cannonfile = doBuild.setCannonfilePath(cannonfile, settings);

      expect(cannonfile).toEqual('cannonfile.toml');
      expect(settings).toEqual(['', 'first=1', 'second=2']);
    });
  });

  describe('provider', () => {
    let provider: viem.PublicClient & viem.WalletClient & viem.TestClient;

    beforeEach(() => {
      jest.spyOn(helpers, 'loadCannonfile').mockResolvedValue({} as any);
      provider = makeFakeProvider();
      jest.spyOn(buildCommand, 'build').mockResolvedValue({ outputs: {}, provider, runtime: {} as any });
      jest.spyOn(utilProvider, 'resolveProvider').mockResolvedValue({ provider: provider as any, signers: [] });
    });

    describe('when resolving chainId', () => {
      const chainId = 999;
      const port = 8589;
      let cannonNode: CannonRpcNode;

      beforeEach(async () => {
        // this test needs a node for the client to connect to
        cannonNode = await runRpc({ port, chainId });
      }, 30000);

      afterEach(async () => {
        cannonNode?.kill('SIGTERM');
      });

      it('should resolve chainId from provider url', async () => {
        const providerUrl = `http://127.0.0.1:${port}`;

        jest.mocked(provider.getChainId).mockResolvedValue(chainId);

        await cli.parseAsync([...fixedArgs, '--provider-url', providerUrl]);

        // create write provider with expected values
        expect((utilProvider.resolveProvider as jest.Mock).mock.calls[0][0].providerUrl).toEqual(providerUrl);
        expect((utilProvider.resolveProvider as jest.Mock).mock.calls[0][1]).toEqual(chainId);
        expect(utilProvider.resolveProvider).toHaveBeenCalledTimes(1);

        // The same provider is passed to build command
        expect((buildCommand.build as jest.Mock).mock.calls[0][0].provider).toEqual(provider);
      });
    });

    it('should connect to frame with provided chainId', async () => {
      const chainId = 999;

      const args = [...fixedArgs, '--chain-id', String(chainId)];

      await cli.parseAsync(args);
      // create write provider with expected values
      expect((utilProvider.resolveProvider as jest.Mock).mock.calls[0][0].providerUrl.split(',')[0]).toEqual('frame');
      expect((utilProvider.resolveProvider as jest.Mock).mock.calls[0][1]).toEqual(chainId);
      expect(utilProvider.resolveProvider).toHaveBeenCalledTimes(1);

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
      jest.spyOn(rpcModule, 'getProvider').mockReturnValue(provider as any);
      await cli.parseAsync(fixedArgs);

      // Create rpc node with default options
      expect(rpcModule.runRpc).toBeCalledTimes(1);
      expect(rpcModule.runRpc).toBeCalledWith({ port: '0' });

      // create provider with rpc node
      expect(rpcModule.getProvider).toBeCalledTimes(1);
      expect(rpcModule.getProvider).toBeCalledWith(cannonRpcNode);

      // The same provider is passed to build command
      expect(buildCommand.build).toBeCalledTimes(1);
      expect((buildCommand.build as jest.Mock).mock.calls[0][0].provider).toEqual(provider);
    });

    it('should prioritize user specified port when provided', async () => {
      const cannonRpcNode: CannonRpcNode = {
        kill: () => {
          // do nothing
        },
      } as CannonRpcNode;
      jest.spyOn(rpcModule, 'runRpc').mockResolvedValue(cannonRpcNode);
      jest.spyOn(rpcModule, 'getProvider').mockReturnValue(provider as any);

      const args = [...fixedArgs, '--port', '8545'];

      await cli.parseAsync(args);

      // Create rpc node with default options
      expect(rpcModule.runRpc).toBeCalledTimes(1);
      expect(rpcModule.runRpc).toBeCalledWith({ port: '8545' });

      // create provider with rpc node
      expect(rpcModule.getProvider).toBeCalledTimes(1);
      expect(rpcModule.getProvider).toBeCalledWith(cannonRpcNode);

      // The same provider is passed to build command
      expect(buildCommand.build).toBeCalledTimes(1);
      expect((buildCommand.build as jest.Mock).mock.calls[0][0].provider).toEqual(provider);
    });
  });
});
