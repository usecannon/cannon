import * as viem from 'viem';
import { IPFSLoader } from './loader';
import { ChainBuilderRuntime, Events } from './runtime';
import { ContractArtifact } from './types';
import { InMemoryRegistry } from './registry';
import { fixtureSigner, fixtureTransactionReceipt, makeFakeProvider } from '../test/fixtures';

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

        expect(receiver).toHaveBeenCalledTimes(Object.keys(Events).length);
      });

      it('increments BroadcastRetry depth across nested derive() calls', () => {
        const child = runtime.derive({});
        const grandchild = child.derive({});
        const receiver = jest.fn();
        runtime.on(Events.BroadcastRetry, receiver);

        grandchild.emit(Events.BroadcastRetry, 1, 4, new Error('x'), 0);

        expect(receiver).toHaveBeenCalledWith(1, 4, expect.any(Error), 2);
      });
    });

    describe('sendTransaction()', () => {
      it('defaults broadcastPolicy when none is given', () => {
        expect(runtime.broadcastPolicy).toEqual({ retries: 3, minTimeout: 250, factor: 2 });
      });

      it('applies the runtime gas settings and returns the receipt', async () => {
        const gasFee = viem.parseGwei('10');
        const priorityGasFee = viem.parseGwei('1');
        const gasRuntime = runtime.derive({ gasFee, priorityGasFee });
        const signer = fixtureSigner();
        const rx = fixtureTransactionReceipt();

        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);
        jest.mocked(signer.wallet.sendTransaction).mockResolvedValue(rx.transactionHash);
        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);

        const receipt = await gasRuntime.sendTransaction(signer, { to: signer.address, data: '0x' });

        expect(receipt).toBe(rx);
        expect(provider.prepareTransactionRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            to: signer.address,
            data: '0x',
            maxFeePerGas: gasFee,
            maxPriorityFeePerGas: priorityGasFee,
          })
        );
        expect(signer.wallet.sendTransaction).toHaveBeenCalledWith(
          expect.objectContaining({ maxFeePerGas: gasFee, maxPriorityFeePerGas: priorityGasFee })
        );
        expect(provider.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: rx.transactionHash });
      });

      it('applies a legacy gas price', async () => {
        const gasPrice = viem.parseGwei('3');
        const gasRuntime = runtime.derive({ gasPrice });
        const signer = fixtureSigner();
        const rx = fixtureTransactionReceipt();

        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);
        jest.mocked(signer.wallet.sendTransaction).mockResolvedValue(rx.transactionHash);
        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);

        await gasRuntime.sendTransaction(signer, { to: signer.address });

        expect(provider.prepareTransactionRequest).toHaveBeenCalledWith(
          expect.objectContaining({ gasPrice, type: 'legacy' })
        );
      });

      it('applies no fee override when neither gasFee nor gasPrice is set', async () => {
        const bareRuntime = runtime.derive({});
        const signer = fixtureSigner();
        const rx = fixtureTransactionReceipt();

        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);
        jest.mocked(signer.wallet.sendTransaction).mockResolvedValue(rx.transactionHash);
        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);

        await bareRuntime.sendTransaction(signer, { to: signer.address });

        expect(provider.prepareTransactionRequest).toHaveBeenCalledWith(
          expect.not.objectContaining({ gasPrice: expect.anything() })
        );
        expect(provider.prepareTransactionRequest).toHaveBeenCalledWith(
          expect.not.objectContaining({ maxFeePerGas: expect.anything() })
        );
        expect(provider.prepareTransactionRequest).toHaveBeenCalledWith(
          expect.not.objectContaining({ maxPriorityFeePerGas: expect.anything() })
        );
      });

      it('emits BroadcastRetry when a broadcast is retried', async () => {
        const retryRuntime = runtime.derive({ broadcastPolicy: { retries: 1, minTimeout: 1, factor: 1 } });
        const signer = fixtureSigner();
        const rx = fixtureTransactionReceipt();

        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);
        jest
          .mocked(signer.wallet.sendTransaction)
          .mockRejectedValueOnce(new Error('rpc glitch'))
          .mockResolvedValueOnce(rx.transactionHash);
        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);
        const receiver = jest.fn();
        retryRuntime.on(Events.BroadcastRetry, receiver);

        await retryRuntime.sendTransaction(signer, { to: signer.address });

        expect(receiver).toHaveBeenCalledWith(1, 2, expect.any(Error), 0);
      });
    });

    describe('gas settings', () => {
      it('sets the gas price', async () => {
        const gasPrice = viem.parseGwei('123456');
        const newRuntime = runtime.derive({
          gasPrice,
        });

        expect(newRuntime.gasPrice).toBe(gasPrice);
        expect(newRuntime.gasFee).toBeUndefined();
        expect(newRuntime.priorityGasFee).toBeUndefined();
      });
      it('sets the gas price and derive again', async () => {
        const gasPrice = viem.parseGwei('123456');
        const newRuntime = runtime.derive({
          gasPrice,
        });

        const newNewRuntime = newRuntime.derive({});

        expect(newNewRuntime.gasPrice).toBe(gasPrice);
        expect(newNewRuntime.gasFee).toBeUndefined();
        expect(newNewRuntime.priorityGasFee).toBeUndefined();
      });

      it('sets gas fee price', async () => {
        const gasFee = viem.parseGwei('123456');
        const newRuntime = runtime.derive({
          gasFee,
        });

        expect(newRuntime.gasFee).toBe(gasFee);
        expect(newRuntime.gasPrice).toBeUndefined();
        expect(newRuntime.priorityGasFee).toBeUndefined();
      });

      it('sets priority gas fee price', async () => {
        const gasFee = viem.parseGwei('123456');
        const priorityGasFee = viem.parseGwei('012345');
        const newRuntime = runtime.derive({
          gasFee,
          priorityGasFee,
        });

        expect(newRuntime.gasFee).toBe(gasFee);
        expect(newRuntime.priorityGasFee).toBe(priorityGasFee);
        expect(newRuntime.gasPrice).toBeUndefined();
      });

      it('ignore gas price if gas fee is set', async () => {
        const gasFee = viem.parseGwei('123456');
        const gasPrice = viem.parseGwei('012345');
        const newRuntime = runtime.derive({
          gasFee,
          gasPrice,
        });

        expect(newRuntime.gasFee).toBe(gasFee);
        expect(newRuntime.priorityGasFee).toBeUndefined();
        expect(newRuntime.gasPrice).toBeUndefined();
      });

      it('throw if priority gas fee is set without gas fee', async () => {
        const priorityGasFee = viem.parseGwei('012345');
        expect(() =>
          runtime.derive({
            priorityGasFee,
          })
        ).toThrow();
      });
    });
  });
});
