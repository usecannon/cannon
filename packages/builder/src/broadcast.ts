import Debug from 'debug';
import promiseRetry from 'promise-retry';
import * as viem from 'viem';
import type { CannonSigner } from './types';

const debug = Debug('cannon:builder:broadcast');

export type BroadcastPolicy = {
  // number of re-sends after the first failed attempt; 0 disables retries
  retries: number;
  // delay before the first retry, in milliseconds
  minTimeout: number;
  // exponential backoff factor applied between retries
  factor: number;
};

export const DEFAULT_BROADCAST_POLICY: BroadcastPolicy = { retries: 3, minTimeout: 250, factor: 2 };

// fee fields mirror viem's discriminated request type: a transaction is either legacy (gasPrice) or
// EIP-1559 (maxFeePerGas / maxPriorityFeePerGas), never both
export type BroadcastFees =
  | { gasPrice?: bigint; maxFeePerGas?: undefined; maxPriorityFeePerGas?: undefined }
  | { gasPrice?: undefined; maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint };

// account, chain and nonce belong to the pipeline; callers never set them. `to` is null for contract
// creation, matching viem's TransactionRequest.
export type BroadcastRequestBase = {
  to?: viem.Address | null;
  data?: viem.Hex;
  value?: bigint;
  gas?: bigint;
};

export type BroadcastRequest = BroadcastRequestBase & BroadcastFees;

export type BroadcastContext = {
  signer: CannonSigner;
  provider: viem.PublicClient;
  policy?: BroadcastPolicy;
  // called before each retry (never after the final failure)
  onRetry?: (attempt: number, maxAttempts: number, err: unknown) => void;
};

// everything viem fills in by default except the nonce. The nonce is assigned exactly once per logical
// send: local accounts consume it from their nonce manager (which never hands out a nonce lower than
// the last one it issued, so a stale replica answering an already-used count is harmless) and keep it
// across retries; json-rpc accounts leave it to the node.
const PREPARE_PARAMETERS: viem.PrepareTransactionRequestParameterType[] = ['chainId', 'fees', 'gas', 'type'];

// cannonfile `overrides.gasLimit` is a decimal string; viem expects `gas` as a bigint
export function parseGasLimit(gasLimit: string | undefined): bigint | undefined {
  if (!gasLimit) return undefined;
  if (!/^\d+$/.test(gasLimit)) {
    throw new Error(`overrides.gasLimit must be a non-negative integer string, got "${gasLimit}"`);
  }
  return BigInt(gasLimit);
}

// viem types the request as a discriminated union on the fee model, so the fee fields are attached
// per branch instead of being spread blindly
function toPrepareParameters(
  request: BroadcastRequest,
  account: viem.Account | viem.Address,
  chain: viem.Chain | undefined
) {
  const base = {
    account,
    chain,
    to: request.to,
    data: request.data,
    value: request.value,
    gas: request.gas,
    parameters: PREPARE_PARAMETERS,
  };
  if (request.gasPrice !== undefined) {
    return { ...base, type: 'legacy' as const, gasPrice: request.gasPrice };
  }
  if (request.maxFeePerGas !== undefined || request.maxPriorityFeePerGas !== undefined) {
    return {
      ...base,
      type: 'eip1559' as const,
      maxFeePerGas: request.maxFeePerGas,
      maxPriorityFeePerGas: request.maxPriorityFeePerGas,
    };
  }
  return base;
}

function isUserRejection(err: unknown): boolean {
  return err instanceof viem.BaseError && !!err.walk((e) => e instanceof viem.UserRejectedRequestError);
}

// viem's request type discriminates the fee model the same way `toPrepareParameters` does; a signed
// transaction is attached the fee fields already resolved on `prepared` instead of spreading blindly
function toSignParameters(
  prepared: Awaited<ReturnType<viem.PublicClient['prepareTransactionRequest']>>,
  nonce: number,
  account: viem.LocalAccount,
  chain: viem.Chain | undefined
) {
  const base = {
    account,
    chain,
    nonce,
    to: prepared.to,
    data: prepared.data,
    value: prepared.value,
    gas: prepared.gas,
    chainId: prepared.chainId,
  };
  if (prepared.type === 'legacy') {
    return { ...base, type: 'legacy' as const, gasPrice: prepared.gasPrice };
  }
  return {
    ...base,
    type: 'eip1559' as const,
    maxFeePerGas: prepared.maxFeePerGas,
    maxPriorityFeePerGas: prepared.maxPriorityFeePerGas,
  };
}

// Sends one transaction through the single live-broadcast path of the builder and resolves with its
// receipt. Local accounts (private-key signers) are signed here so that a retry re-broadcasts the exact
// same nonce; json-rpc accounts (Frame, anvil impersonation) are sent through the wallet and retried as-is
// — see the caveat on broadcastViaWallet below, which still applies only to that path. Deterministic
// failures (reverts) fail identically on each attempt and surface the last error. An explicit user
// rejection (EIP-1193 code 4001) is never retried.
export async function broadcastTransaction(
  ctx: BroadcastContext,
  request: BroadcastRequest
): Promise<viem.TransactionReceipt> {
  const account = ctx.signer.wallet.account ?? ctx.signer.address;
  const hash =
    typeof account !== 'string' && account.type === 'local'
      ? await broadcastSigned(ctx, request, account)
      : await broadcastViaWallet(ctx, request, account);

  return ctx.provider.waitForTransactionReceipt({ hash });
}

// Local accounts: sign and broadcast the raw transaction locally. Every attempt re-prepares on the
// provider (fresh gas and fees), but the nonce is taken from the account's nonce manager exactly once —
// on whichever attempt first prepares successfully — and reused unchanged after that, so a prepare
// failure never consumes a nonce. Before every retry the node is asked whether one of the variants signed
// for this nonce is already known (the RPC may have accepted it and lost the reply); if so, that hash is
// awaited instead of re-sending. One nonce per logical send means at most one variant can ever execute —
// a retry can neither double-execute a step nor leave a nonce gap behind. If the nonce was taken by
// someone else meanwhile, every attempt fails with the node's nonce error and the build stops; the next
// build reads a fresh nonce.
async function broadcastSigned(
  ctx: BroadcastContext,
  request: BroadcastRequest,
  account: viem.LocalAccount
): Promise<viem.Hash> {
  const { signer, provider } = ctx;
  const policy = ctx.policy ?? DEFAULT_BROADCAST_POLICY;
  const maxAttempts = policy.retries + 1;

  let nonce: number | undefined;
  const signedHashes: viem.Hash[] = [];

  return promiseRetry(
    { retries: policy.retries, minTimeout: policy.minTimeout, factor: policy.factor },
    async (retry, attempt) => {
      try {
        // prepared fresh on every attempt: a retry picks up current gas and fees
        const prepared = await provider.prepareTransactionRequest(toPrepareParameters(request, account, provider.chain));

        // the nonce is taken once per logical send and reused by every later attempt, so at most one of
        // the signed variants can ever execute
        if (nonce === undefined) {
          const chainId = prepared.chainId ?? (await provider.getChainId());
          nonce = account.nonceManager
            ? await account.nonceManager.consume({ address: account.address, chainId, client: provider })
            : await provider.getTransactionCount({ address: account.address, blockTag: 'pending' });
        }

        const serialized = await signer.wallet.signTransaction(
          toSignParameters(prepared, nonce, account, signer.wallet.chain)
        );
        const hash = viem.keccak256(serialized);
        signedHashes.push(hash);

        await provider.sendRawTransaction({ serializedTransaction: serialized });
        return hash;
      } catch (err) {
        debug(`broadcast attempt ${attempt}/${maxAttempts} failed${nonce === undefined ? '' : ` (nonce ${nonce})`}:`, err);

        const known = await findKnownTransaction(provider, signedHashes);
        if (known) {
          debug(`transaction ${known} (nonce ${nonce}) is already known to the node; awaiting it instead of re-sending`);
          return known;
        }

        if (attempt < maxAttempts) ctx.onRetry?.(attempt, maxAttempts, err);
        return retry(err);
      }
    }
  );
}

// json-rpc accounts: the node assigns the nonce on every send, so a retry simply prepares and sends
// again. Caveat: if an earlier attempt actually reached the node before failing locally (a lost response,
// a timeout), the wallet can prompt the signer a second time and the node can end up with two accepted
// transactions at different nonces for the same logical send — unlike the local-account path above,
// retries here are not idempotent.
async function broadcastViaWallet(
  ctx: BroadcastContext,
  request: BroadcastRequest,
  account: viem.Account | viem.Address
): Promise<viem.Hash> {
  const { signer, provider } = ctx;
  const policy = ctx.policy ?? DEFAULT_BROADCAST_POLICY;
  const maxAttempts = policy.retries + 1;

  return promiseRetry(
    { retries: policy.retries, minTimeout: policy.minTimeout, factor: policy.factor },
    async (retry, attempt) => {
      try {
        const prepared = await provider.prepareTransactionRequest(toPrepareParameters(request, account, provider.chain));
        return await signer.wallet.sendTransaction({ ...prepared, account, chain: signer.wallet.chain });
      } catch (err) {
        if (isUserRejection(err)) throw err;

        debug(`broadcast attempt ${attempt}/${maxAttempts} failed:`, err);

        if (attempt < maxAttempts) ctx.onRetry?.(attempt, maxAttempts, err);
        return retry(err);
      }
    }
  );
}

// Returns the first of the given hashes the node already knows (pending or mined), or null. A lookup
// failure other than "not found" is logged and treated as unknown: if the RPC is really down, the
// retried send reports it.
async function findKnownTransaction(provider: viem.PublicClient, hashes: viem.Hash[]): Promise<viem.Hash | null> {
  for (const hash of hashes) {
    try {
      await provider.getTransaction({ hash });
      return hash;
    } catch (err) {
      if (!(err instanceof viem.TransactionNotFoundError)) {
        debug(`could not check whether ${hash} is known to the node:`, err);
      }
    }
  }
  return null;
}
