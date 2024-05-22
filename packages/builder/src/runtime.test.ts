import * as viem from 'viem';
import { IPFSLoader } from './loader';
import { ChainBuilderRuntime, Events } from './runtime';
import { ContractArtifact } from './types';
import { InMemoryRegistry } from './registry';
import { fixtureSigner, makeFakeProvider } from '../test/fixtures';

jest.mock('./loader');

describe('runtime.ts', () => {
  describe('ChainBuilderRuntime', () => {
    let loader: IPFSLoader;
    let provider: viem.PublicClient & viem.TestClient;
    let runtime: ChainBuilderRuntime;

    const getSigner = jest.fn(async () => fixtureSigner());

    const getDefaultSigner = jest.fn(async () => fixtureSigner());

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
      provider = makeFakeProvider();

      loader = new IPFSLoader('', null as any);

      runtime = new ChainBuilderRuntime(
        {
          allowPartialDeploy: true,
          provider,
          chainId: 1234,
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
        expect(runtime.snapshots).toBe(true);
      });
    });

    describe('checkNetwork()', () => {
      it('throws if the chainId does not match', async () => {
        jest.mocked(provider.getChainId).mockResolvedValue(5678);
        await expect(() => runtime.checkNetwork()).rejects.toThrowError('provider network reported chainId');
      });

      it('does nothing further if it matches', async () => {
        jest.mocked(provider.getChainId).mockResolvedValue(1234);
        await runtime.checkNetwork();
      });
    });

    describe('loadState()', () => {
      it('does nothing if snapshots = false', async () => {
        (runtime as any).snapshots = false;
        await runtime.loadState('0x');
        expect(jest.mocked(provider.loadState)).toBeCalledTimes(0);
      });

      it('does calls hardhat_loadState if snapshots = true', async () => {
        (runtime as any).snapshots = true;
        await runtime.loadState('0xdeadbeef');
        expect(jest.mocked(provider.loadState)).toBeCalledWith({ state: '0xdeadbeef' });
      });
    });

    describe('dumpState()', () => {
      it('does nothing if snapshots = false', async () => {
        (runtime as any).snapshots = false;
        await runtime.dumpState();
        expect(jest.mocked(provider.dumpState)).toBeCalledTimes(0);
      });

      it('does calls hardhat_dumpState if snapshots = true', async () => {
        (runtime as any).snapshots = true;
        jest.mocked(provider.dumpState).mockResolvedValue('0xdeadbeef');
        expect(await runtime.dumpState()).toBe('0xdeadbeef');
        expect(jest.mocked(provider.dumpState)).toBeCalledWith();
      });
    });

    describe('clearNode()', () => {
      it('does nothing if snapshots = false', async () => {
        (runtime as any).snapshots = false;
        await runtime.clearNode();
        expect(jest.mocked(provider.snapshot)).toBeCalledTimes(0);
      });

      it('does calls evm_revert and evm_snapshots if snapshots = true', async () => {
        (runtime as any).snapshots = true;
        await runtime.clearNode();
        expect(jest.mocked(provider.snapshot)).toBeCalledWith();
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

    describe('gas settings', () => {
      it('sets the gas price', async () => {
        const gasPrice = '123456';
        const newRuntime = runtime.derive({
          gasPrice,
        });

        expect(newRuntime.gasPrice).toBe(viem.parseGwei(gasPrice).toString());
        expect(newRuntime.gasFee).toBeUndefined();
        expect(newRuntime.priorityGasFee).toBeUndefined();
      });
      it('sets the gas price and derive again', async () => {
        const gasPrice = '123456';
        const newRuntime = runtime.derive({
          gasPrice,
        });

        const newNewRuntime = newRuntime.derive({});

        expect(newNewRuntime.gasPrice).toBe(viem.parseGwei(gasPrice).toString());
        expect(newNewRuntime.gasFee).toBeUndefined();
        expect(newNewRuntime.priorityGasFee).toBeUndefined();
      });

      it('sets gas fee price', async () => {
        const gasFee = '123456';
        const newRuntime = runtime.derive({
          gasFee,
        });

        expect(newRuntime.gasFee).toBe(viem.parseGwei(gasFee).toString());
        expect(newRuntime.gasPrice).toBeUndefined();
        expect(newRuntime.priorityGasFee).toBeUndefined();
      });

      it('sets priority gas fee price', async () => {
        const gasFee = '123456';
        const priorityGasFee = '012345';
        const newRuntime = runtime.derive({
          gasFee,
          priorityGasFee,
        });

        expect(newRuntime.gasFee).toBe(viem.parseGwei(gasFee).toString());
        expect(newRuntime.priorityGasFee).toBe(viem.parseGwei(priorityGasFee).toString());
        expect(newRuntime.gasPrice).toBeUndefined();
      });

      it('ignore gas price if gas fee is set', async () => {
        const gasFee = '123456';
        const gasPrice = '012345';
        const newRuntime = runtime.derive({
          gasFee,
          gasPrice,
        });

        expect(newRuntime.gasFee).toBe(viem.parseGwei(gasFee).toString());
        expect(newRuntime.priorityGasFee).toBeUndefined();
        expect(newRuntime.gasPrice).toBeUndefined();
      });

      it('throw if priority gas fee is set without gas fee', async () => {
        const priorityGasFee = '012345';
        expect(() =>
          runtime.derive({
            priorityGasFee,
          })
        ).toThrow();
      });
    });
  });
});
