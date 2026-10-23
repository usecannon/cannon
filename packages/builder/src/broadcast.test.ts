import * as viem from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { createNonceManager, jsonRpc } from 'viem/nonce';
import { broadcastTransaction, DEFAULT_BROADCAST_POLICY, parseGasLimit } from './broadcast';
import type { CannonSigner } from './types';

const CHAIN: viem.Chain = { ...mainnet, id: 6343 };
const PRIVATE_KEY = '0x1111111111111111111111111111111111111111111111111111111111111111';
const TX_HASH = `0x${'ab'.repeat(32)}` as viem.Hash;
const TARGET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as viem.Address;

// The RPC keeps answering a stale pending nonce (5) no matter what was already sent. This is the
// strict-ordering / lagging-replica behaviour from issue #1875 that the pipeline has to survive.
const STALE_NONCE = '0x5';

type Harness = {
  signer: CannonSigner;
  provider: viem.PublicClient;
  calls: Record<string, number>;
  sendErrors: Error[];
  lookupErrors: Error[];
  prepareErrors: Error[];
  consume: jest.Mock;
  signedNonces: () => number[];
  signedTxns: () => viem.TransactionSerializableGeneric[];
  receipts: viem.Hash[];
  rawSends: viem.Hex[];
  known: Set<viem.Hash>;
  setPriorityFee: (hex: viem.Hex) => void;
};

function makeHarness(opts: { jsonRpcAccount?: boolean } = {}): Harness {
  const calls: Record<string, number> = {};
  const sendErrors: Error[] = [];
  const lookupErrors: Error[] = [];
  const prepareErrors: Error[] = [];
  const receipts: viem.Hash[] = [];
  const rawSends: viem.Hex[] = [];
  const known = new Set<viem.Hash>();
  let priorityFee: viem.Hex = '0x1';

  // retryCount: 0 — viem's transport-level retry would otherwise swallow the injected failures
  const transport = viem.custom(
    {
      async request({ method, params }: { method: string; params?: unknown[] }) {
        calls[method] = (calls[method] ?? 0) + 1;
        switch (method) {
          case 'eth_chainId':
            return viem.numberToHex(CHAIN.id);
          case 'eth_getTransactionCount':
            return STALE_NONCE;
          case 'eth_estimateGas':
            return '0x5208';
          case 'eth_getBlockByNumber':
            return {
              baseFeePerGas: '0x1',
              number: '0x1',
              gasLimit: '0x1',
              gasUsed: '0x0',
              timestamp: '0x0',
              transactions: [],
            };
          case 'eth_maxPriorityFeePerGas':
            return priorityFee;
          case 'eth_sendRawTransaction': {
            const [raw] = params as [viem.Hex];
            rawSends.push(raw);
            const err = sendErrors.shift();
            if (err) {
              // 'socket hang up' models a node that accepted the transaction but whose reply was lost
              if (err.message === 'socket hang up') known.add(viem.keccak256(raw));
              throw err;
            }
            return viem.keccak256(raw);
          }
          case 'eth_sendTransaction': {
            const err = sendErrors.shift();
            if (err) throw err;
            return TX_HASH;
          }
          case 'eth_getTransactionByHash': {
            const [hash] = params as [viem.Hash];
            const lookupErr = lookupErrors.shift();
            if (lookupErr) throw lookupErr;
            if (!known.has(hash)) return null;
            return {
              hash,
              nonce: STALE_NONCE,
              from: TARGET,
              to: TARGET,
              value: '0x0',
              gas: '0x5208',
              input: '0x',
              blockHash: null,
              blockNumber: null,
              transactionIndex: null,
              type: '0x2',
              chainId: viem.numberToHex(CHAIN.id),
              maxFeePerGas: '0x1',
              maxPriorityFeePerGas: '0x1',
              v: '0x0',
              r: '0x0',
              s: '0x0',
            };
          }
          default:
            throw new Error(`unexpected rpc method ${method}`);
        }
      },
    },
    { retryCount: 0 }
  );

  const manager = createNonceManager({ source: jsonRpc() });
  const consume = jest.fn((args: Parameters<viem.NonceManager['consume']>[0]) => manager.consume(args));
  const account = privateKeyToAccount(PRIVATE_KEY, { nonceManager: { ...manager, consume } });
  const signTransaction = jest.spyOn(account, 'signTransaction');

  const wallet = viem.createWalletClient({ account: opts.jsonRpcAccount ? TARGET : account, chain: CHAIN, transport });

  const provider = viem.createPublicClient({ chain: CHAIN, transport }).extend((client) => ({
    waitForTransactionReceipt: async ({ hash }: { hash: viem.Hash }) => {
      receipts.push(hash);
      return { transactionHash: hash, status: 'success' } as viem.TransactionReceipt;
    },
    // shifts an injected failure before delegating to the real prepare, so tests still exercise viem's
    // actual prepareTransactionRequest path (fee/gas estimation) rather than a stubbed-out replacement
    prepareTransactionRequest: (async (args: Parameters<typeof client.prepareTransactionRequest>[0]) => {
      const err = prepareErrors.shift();
      if (err) throw err;
      return client.prepareTransactionRequest(args);
    }) as typeof client.prepareTransactionRequest,
  }));

  return {
    signer: { address: wallet.account.address, wallet },
    provider,
    calls,
    sendErrors,
    lookupErrors,
    prepareErrors,
    consume,
    signedNonces: () => signTransaction.mock.calls.map(([tx]) => Number(tx.nonce)),
    signedTxns: () => signTransaction.mock.calls.map(([tx]) => tx as viem.TransactionSerializableGeneric),
    receipts,
    rawSends,
    known,
    setPriorityFee: (hex) => {
      priorityFee = hex;
    },
  };
}

describe('broadcast.ts', () => {
  describe('parseGasLimit()', () => {
    it('returns undefined when no gas limit is configured', () => {
      expect(parseGasLimit(undefined)).toBeUndefined();
      expect(parseGasLimit('')).toBeUndefined();
    });

    it('parses a decimal gas limit string', () => {
      expect(parseGasLimit('3000000')).toBe(BigInt(3000000));
    });

    it('rejects a non-integer gas limit string', () => {
      expect(() => parseGasLimit('1e6')).toThrow(/gasLimit/);
    });

    it('rejects a negative gas limit string', () => {
      expect(() => parseGasLimit('-5')).toThrow(/gasLimit/);
    });
  });

  describe('broadcastTransaction()', () => {
    const request = { to: TARGET, data: '0x' as viem.Hex, value: BigInt(0) };
    const fastPolicy = { retries: 3, minTimeout: 1, factor: 1 };

    it('has a default policy of 3 retries with backoff', () => {
      expect(DEFAULT_BROADCAST_POLICY).toEqual({ retries: 3, minTimeout: 250, factor: 2 });
    });

    it('signs locally, consumes the nonce once and awaits the receipt by the raw transaction hash', async () => {
      const h = makeHarness();

      const receipt = await broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy }, request);

      expect(h.rawSends).toHaveLength(1);
      expect(receipt.transactionHash).toBe(viem.keccak256(h.rawSends[0]));
      expect(h.receipts).toEqual([viem.keccak256(h.rawSends[0])]);
      expect(h.consume).toHaveBeenCalledTimes(1);
      // the only pending-nonce read belongs to the manager; prepareTransactionRequest must not fetch one itself
      expect(h.calls.eth_getTransactionCount).toBe(1);
      expect(h.signedNonces()).toEqual([5]);
      expect(h.calls.eth_sendTransaction).toBeUndefined();
    });

    it('takes consecutive nonces across sends even though the RPC keeps answering the stale count', async () => {
      const h = makeHarness();

      await broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy }, request);
      await broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy }, request);

      // the manager never hands out a nonce below the last one it issued, so a lagging replica is harmless
      expect(h.signedNonces()).toEqual([5, 6]);
      expect(h.calls.eth_getTransactionCount).toBe(2);
    });

    it('re-sends with the same nonce after a failed broadcast', async () => {
      const h = makeHarness();
      h.sendErrors.push(new Error('rpc glitch'));
      const onRetry = jest.fn();

      await broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy, onRetry }, request);

      // one logical send = one nonce, however many attempts it takes: no gap, no second execution
      expect(h.consume).toHaveBeenCalledTimes(1);
      expect(h.signedNonces()).toEqual([5, 5]);
      expect(h.rawSends).toHaveLength(2);
      expect(h.calls.eth_getTransactionByHash).toBe(1);
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, 4, expect.any(Error));
    });

    it('re-signs with fresh fees but the same nonce when the first attempt was rejected', async () => {
      const h = makeHarness();
      h.sendErrors.push(new Error('max fee per gas less than block base fee'));

      const pending = broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy }, request);
      // let the first attempt's fee fetch (a microtask chain through the mock transport) settle before
      // changing the fee, otherwise the mutation would race ahead of it and both attempts would see '0x5'
      await new Promise((resolve) => setImmediate(resolve));
      h.setPriorityFee('0x5');
      await pending;

      const [first, second] = h.signedTxns();
      expect(first.nonce).toBe(5);
      expect(second.nonce).toBe(5);
      expect(first.maxPriorityFeePerGas).toBe(BigInt(1));
      expect(second.maxPriorityFeePerGas).toBe(BigInt(5));
      expect(h.rawSends[0]).not.toBe(h.rawSends[1]);
    });

    it('retries a rejecting prepare on the first attempt and still consumes the nonce once', async () => {
      const h = makeHarness();
      h.prepareErrors.push(new Error('fee estimation blip'));
      const onRetry = jest.fn();

      const receipt = await broadcastTransaction(
        { signer: h.signer, provider: h.provider, policy: fastPolicy, onRetry },
        request
      );

      expect(receipt.transactionHash).toBe(viem.keccak256(h.rawSends[0]));
      expect(h.rawSends).toHaveLength(1);
      expect(h.consume).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, 4, expect.any(Error));
    });

    it('never consumes a nonce when prepare never succeeds', async () => {
      const h = makeHarness();
      h.prepareErrors.push(new Error('first'), new Error('second'), new Error('third'), new Error('fourth'));
      const onRetry = jest.fn();

      await expect(
        broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy, onRetry }, request)
      ).rejects.toThrow('fourth');

      // a prepare that never succeeds never reaches the point where a nonce would be consumed
      expect(h.consume).not.toHaveBeenCalled();
      expect(h.rawSends).toHaveLength(0);
      expect(onRetry).toHaveBeenCalledTimes(3);
    });

    it('re-enters the loop and succeeds with the same nonce when prepare fails after a failed send', async () => {
      const h = makeHarness();
      h.sendErrors.push(new Error('rpc glitch'));
      const onRetry = jest.fn();

      const pending = broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy, onRetry }, request);
      // attempt 1's prepare call has already run synchronously by this point (it shifted an empty
      // prepareErrors queue and succeeded); queuing the failure now lands it on attempt 2's prepare
      // instead, after attempt 1's send has already failed and consumed the nonce
      h.prepareErrors.push(new Error('fee estimation blip'));
      const receipt = await pending;

      expect(receipt.transactionHash).toBe(viem.keccak256(h.rawSends[h.rawSends.length - 1]));
      expect(h.rawSends).toHaveLength(2);
      expect(h.consume).toHaveBeenCalledTimes(1);
      expect(h.signedNonces()).toEqual([5, 5]);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('does not re-send when the failed transaction is already known to the node', async () => {
      const h = makeHarness();
      const onRetry = jest.fn();
      // the node accepted the transaction but the RPC reply was lost: the transport marks the raw
      // transaction as known before throwing (see the 'socket hang up' branch in makeHarness)
      h.sendErrors.push(new Error('socket hang up'));

      const receipt = await broadcastTransaction(
        { signer: h.signer, provider: h.provider, policy: fastPolicy, onRetry },
        request
      );

      expect(h.rawSends).toHaveLength(1);
      expect(receipt.transactionHash).toBe(viem.keccak256(h.rawSends[0]));
      expect(h.receipts).toEqual([viem.keccak256(h.rawSends[0])]);
      expect(h.calls.eth_getTransactionByHash).toBe(1);
      expect(onRetry).not.toHaveBeenCalled();
    });

    it('treats a transaction lookup failure as unknown and retries', async () => {
      const h = makeHarness();
      h.sendErrors.push(new Error('rpc glitch'));
      h.lookupErrors.push(new Error('rpc down'));
      const onRetry = jest.fn();

      await broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy, onRetry }, request);

      // the lookup itself failed (not a "not found"), so it must not be mistaken for "known": the
      // pipeline still retries instead of silently stalling
      expect(h.calls.eth_getTransactionByHash).toBe(1);
      expect(h.rawSends).toHaveLength(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('sends exactly once when retries is 0', async () => {
      const h = makeHarness();
      h.sendErrors.push(new Error('rpc glitch'));
      const onRetry = jest.fn();

      await expect(
        broadcastTransaction(
          { signer: h.signer, provider: h.provider, policy: { ...fastPolicy, retries: 0 }, onRetry },
          request
        )
      ).rejects.toThrow('rpc glitch');

      expect(h.rawSends).toHaveLength(1);
      expect(h.calls.eth_getTransactionByHash).toBe(1);
      expect(onRetry).not.toHaveBeenCalled();
    });

    it('surfaces the last error without advancing the nonce once retries are exhausted', async () => {
      const h = makeHarness();
      h.sendErrors.push(new Error('first'), new Error('second'), new Error('third'), new Error('fourth'));
      const onRetry = jest.fn();

      await expect(
        broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy, onRetry }, request)
      ).rejects.toThrow('fourth');

      expect(h.rawSends).toHaveLength(4);
      expect(h.consume).toHaveBeenCalledTimes(1);
      expect(h.signedNonces()).toEqual([5, 5, 5, 5]);
      expect(onRetry).toHaveBeenCalledTimes(3);
      expect(h.receipts).toEqual([]);
    });

    it('does not retry when a json-rpc signer rejected the request', async () => {
      const h = makeHarness({ jsonRpcAccount: true });
      h.sendErrors.push(new viem.UserRejectedRequestError(new Error('user said no')));

      await expect(
        broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy }, request)
      ).rejects.toThrow('User rejected the request');

      expect(h.calls.eth_sendTransaction).toBe(1);
    });

    it('retries json-rpc backed signers, which have no nonce manager', async () => {
      const h = makeHarness({ jsonRpcAccount: true });
      h.sendErrors.push(new Error('rpc glitch'));

      const receipt = await broadcastTransaction({ signer: h.signer, provider: h.provider, policy: fastPolicy }, request);

      expect(receipt.transactionHash).toBe(TX_HASH);
      expect(h.calls.eth_sendTransaction).toBe(2);
      expect(h.calls.eth_sendRawTransaction).toBeUndefined();
    });

    it('passes explicit gas and EIP-1559 fees through to the signed transaction', async () => {
      const h = makeHarness();

      await broadcastTransaction(
        { signer: h.signer, provider: h.provider, policy: fastPolicy },
        { ...request, gas: BigInt(123456), maxFeePerGas: BigInt(77), maxPriorityFeePerGas: BigInt(7) }
      );

      const [signed] = h.signedTxns();
      expect(signed.gas).toBe(BigInt(123456));
      expect(signed.maxFeePerGas).toBe(BigInt(77));
      expect(signed.maxPriorityFeePerGas).toBe(BigInt(7));
      expect(h.calls.eth_estimateGas).toBeUndefined();
      expect(signed.to).toBe(TARGET);
      expect(signed.data).toBe('0x');
      expect(signed.value).toBe(BigInt(0));
      expect(signed.chainId).toBe(CHAIN.id);
    });

    it('sends a legacy transaction when gasPrice is given', async () => {
      const h = makeHarness();

      await broadcastTransaction(
        { signer: h.signer, provider: h.provider, policy: fastPolicy },
        { ...request, gasPrice: BigInt(9) }
      );

      const [signed] = h.signedTxns();
      expect(signed.type).toBe('legacy');
      expect(signed.gasPrice).toBe(BigInt(9));
    });
  });
});
