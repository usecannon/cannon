import { ethers } from 'ethers';
import { CannonWrapperGenericProvider } from './error/provider';
import { IPFSLoader } from './loader';
import { ChainBuilderRuntime, Events } from './runtime';
import { ContractArtifact } from './types';
import { InMemoryRegistry } from './registry';

jest.mock('./error/provider');
jest.mock('./loader');

describe('runtime.ts', () => {
  describe('ChainBuilderRuntime', () => {
    //jest.mocked(ethers.providers.JsonRpcProvider);
    jest.mocked(CannonWrapperGenericProvider);

    let loader: IPFSLoader;
    let provider: CannonWrapperGenericProvider;
    let runtime: ChainBuilderRuntime;

    const getSigner = jest.fn(async () => {
      return ethers.Wallet.createRandom();
    });

    const getDefaultSigner = jest.fn(async () => {
      return ethers.Wallet.createRandom();
    });

    const getArtifact = jest.fn(async (n: string): Promise<ContractArtifact> => {
      return {
        contractName: n,
        sourceName: `${n}.sol`,
        abi: [],
        bytecode: '0x',
        deployedBytecode: '0x',
        linkReferences: {},
      };
    });

    beforeAll(async () => {
      provider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider());

      loader = new IPFSLoader('', null as any);

      runtime = new ChainBuilderRuntime(
        {
          allowPartialDeploy: true,
          provider,
          chainId: 1234,
          publicSourceCode: true,
          snapshots: true,
          getSigner,
          getDefaultSigner,
          getArtifact,
        },
        new InMemoryRegistry(),
        { ipfs: loader }
      );
    });

    describe('constructor', () => {
      it('sets values', async () => {
        expect(runtime.allowPartialDeploy).toBe(true);
        expect(runtime.chainId).toBe(1234);
        //expect(runtime.getArtifact).toBe(); // this is wrapped
        expect(runtime.getDefaultSigner).toBe(getDefaultSigner);
        expect(runtime.getSigner).toBe(getSigner);
        expect(runtime.loaders.ipfs).toBe(loader);
        expect(runtime.provider).toBe(provider);
        expect(runtime.publicSourceCode).toBe(true);
        expect(runtime.snapshots).toBe(true);
      });
    });

    describe('checkNetwork()', () => {
      it('throws if the chainId does not match', async () => {
        jest.mocked(provider.getNetwork).mockResolvedValue({ chainId: 5678, name: 'foobar' });
        await expect(() => runtime.checkNetwork()).rejects.toThrowError('provider network reported chainId');
      });

      it('does nothing further if it matches', async () => {
        jest.mocked(provider.getNetwork).mockResolvedValue({ chainId: 1234, name: 'foobar' });
        await runtime.checkNetwork();
      });
    });

    describe('loadState()', () => {
      it('does nothing if snapshots = false', async () => {
        (runtime as any).snapshots = false;
        await runtime.loadState('0x');
        expect(jest.mocked(provider.send)).toBeCalledTimes(0);
      });

      it('does calls hardhat_loadState if snapshots = true', async () => {
        (runtime as any).snapshots = true;
        await runtime.loadState('0xdeadbeef');
        expect(jest.mocked(provider.send)).toBeCalledWith('hardhat_loadState', ['0xdeadbeef']);
      });
    });

    describe('dumpState()', () => {
      it('does nothing if snapshots = false', async () => {
        (runtime as any).snapshots = false;
        await runtime.dumpState();
        expect(jest.mocked(provider.send)).toBeCalledTimes(0);
      });

      it('does calls hardhat_dumpState if snapshots = true', async () => {
        (runtime as any).snapshots = true;
        jest.mocked(provider.send).mockResolvedValue('0xdeadbeef');
        expect(await runtime.dumpState()).toBe('0xdeadbeef');
        expect(jest.mocked(provider.send)).toBeCalledWith('hardhat_dumpState', []);
      });
    });

    describe('clearNode()', () => {
      it('does nothing if snapshots = false', async () => {
        (runtime as any).snapshots = false;
        await runtime.clearNode();
        expect(jest.mocked(provider.send)).toBeCalledTimes(0);
      });

      it('does calls evm_revert and evm_snapshots if snapshots = true', async () => {
        (runtime as any).snapshots = true;
        await runtime.clearNode();
        expect(jest.mocked(provider.send)).toBeCalledWith('evm_snapshot', []);
      });
    });

    describe('recordMisc()', () => {
      it('calls loader putMisc', async () => {
        jest.mocked(loader.put).mockResolvedValue('ipfs://Qmsaved');
        const url = await runtime.recordMisc();

        expect(url).toBe('ipfs://Qmsaved');

        expect(loader.put).toBeCalledWith({ artifacts: {} });
      });
    });

    describe('restoreMisc()', () => {
      it('does nothing if the loadedMisc url is the same', async () => {
        (runtime as any).loadedMisc = 'ipfs://Qmdone';

        await runtime.restoreMisc('ipfs://Qmdone');

        expect(loader.read).toBeCalledTimes(0);
      });

      it('calls readMisc if loadedMisc url is different, and sets to misc storage', async () => {
        jest.mocked(loader.read).mockResolvedValue({ some: 'stuff' });
        await runtime.restoreMisc('ipfs://Qmsaved');

        expect(loader.read).toBeCalledWith('ipfs://Qmsaved');

        expect(runtime.misc).toStrictEqual({ some: 'stuff' });
      });
    });

    describe('derive()', () => {
      let newRuntime: ChainBuilderRuntime;

      beforeAll(async () => {
        newRuntime = runtime.derive({
          chainId: 5,
          allowPartialDeploy: false,
        });
      });

      it('is constructed with same values excluding the overridden properties', async () => {
        expect(newRuntime).not.toEqual(runtime);
        expect(newRuntime.allowPartialDeploy).toBeFalsy();
        expect(newRuntime.chainId).toBe(5);
        expect(newRuntime.getSigner).toBe(runtime.getSigner);
      });

      it('forwards all events', async () => {
        const receiver = jest.fn();

        let evt: keyof typeof Events;
        for (evt in Events) {
          runtime.on(Events[evt], receiver);
          newRuntime.emit(Events[evt], 'dummy');
        }

        expect(receiver).toBeCalledTimes(Object.keys(Events).length);
      });
    });
  });
});
