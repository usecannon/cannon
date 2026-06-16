import Debug from 'debug';
import * as viem from 'viem';
import { mainnet, optimism } from 'viem/chains';
import promiseRetry from 'promise-retry';
import { getArtifacts } from './builder';
import { CANNON_CHAIN_ID, DEFAULT_REGISTRY_ADDRESS, DEFAULT_REGISTRY_CONFIG, getCannonRepoRegistryUrl } from './constants';
import { IPFSLoader } from './loader';
import { PackageReference } from './package-reference';
import { OnChainRegistry, FallbackRegistry, InMemoryRegistry } from './registry';
import { CannonStorage } from './runtime';
import { getContractFromPath } from './util';
import type { CannonSigner } from './types';

const debug = Debug('cannon:builder:helpers');

export function getDefaultStorage() {
  const registryChainIds = DEFAULT_REGISTRY_CONFIG.map((registry) => registry.chainId);

  const onChainRegistries = registryChainIds.map(
    (chainId: number) =>
      new OnChainRegistry({
        address: DEFAULT_REGISTRY_ADDRESS,
        provider: viem.createPublicClient({
          // TODO: support extracting any chain
          chain: viem.extractChain({ chains: [mainnet, optimism], id: chainId as 10 | 1 }),
          transport: viem.http(),
        }) as viem.PublicClient,
      })
  );

  // Create a regsitry that loads data first from Memory to be able to utilize
  // the locally built data
  const fallbackRegistry = new FallbackRegistry([new InMemoryRegistry(), ...onChainRegistries]);
  return new CannonStorage(fallbackRegistry, {
    ipfs: new IPFSLoader(getCannonRepoRegistryUrl()),
  });
}

export async function getCannonContract(args: {
  package: string | PackageReference;
  chainId?: number;
  contractName: string;
  storage?: CannonStorage;
}) {
  const storage = args.storage ?? getDefaultStorage();

  const deployInfo = await storage.readDeploy(
    typeof args.package === 'string' ? args.package : args.package.fullPackageRef,
    args.chainId ?? CANNON_CHAIN_ID
  );

  if (!deployInfo) {
    throw new Error(`cannon package not found: ${args.package} (${args.chainId})`);
  }

  const { ChainDefinition } = await import('./definition');
  const artifacts = getArtifacts(new ChainDefinition(deployInfo.def), deployInfo.state);

  const contract = getContractFromPath(artifacts, args.contractName);

  if (!contract) {
    throw new Error(
      `requested contract ${args.contractName} not found in cannon package: ${args.package} (${args.chainId})`
    );
  }

  return contract;
}

export async function loadPrecompiles(provider: viem.TestClient) {
  const precompiles = await import('./precompiles');

  for (const precompileCall of precompiles.default) await provider.setCode(precompileCall);
}
// due to flaky RPC issues (ex. load balancer where the state propagates unevenly), it is sometimes the case that the block
// due to flaky RPC issues (ex. load balancer where hte state propogates unevenly), it is sometimes the case that the block
// information comes in *after* the receipt is available. This function is intended to provide an auto-retry capability
// for any errors that could be encountered on this specific problematic call
export async function getBlockRetried(provider: viem.PublicClient, blockHash: viem.Hash) {
  return await promiseRetry({ retries: 5, minTimeout: 50 }, (retry) => {
    return provider.getBlock({ blockHash }).catch(retry);
  });
}

// Resets the signer's viem nonce manager (when it has one) so the next transaction prepare
// re-reads the pending nonce from the chain. Live private-key signers created by the CLI carry a
// nonce manager; JSON-RPC backed signers (e.g. Frame) do not — the remote node assigns their
// nonces on every send, so there is no client-side nonce state to reset for them. Returns
// whether a reset actually happened so the caller can log it.
async function resetSignerNonce(signer: CannonSigner): Promise<boolean> {
  const account = signer.wallet.account;
  if (account?.type !== 'local' || !account.nonceManager) return false;

  // the nonce manager is keyed by (address, chainId); resolve the chain id the same way viem
  // does when it consumes a nonce (the wallet's configured chain, falling back to eth_chainId)
  const chainId = signer.wallet.chain?.id ?? (await signer.wallet.getChainId());
  account.nonceManager.reset({ address: account.address, chainId });
  return true;
}

// Wraps a live broadcast: runs the prepare+send closure and retries any failure with exponential
// backoff. There is no reliable error shape for nonce problems across RPC providers, so rather
// than trying to detect them we always assume the nonce may be broken: before every retry the
// signer's nonce manager (when present) is reset, and the closure re-reads a fresh pending nonce
// while re-preparing the transaction. Deterministic failures (e.g. reverts) fail the same way on
// every attempt and surface the original error, so the only cost there is the backoff delay. The
// one exception is an explicit user rejection (EIP-1193 code 4001), which is never retried — a
// wallet user who declined to sign should not be re-prompted.
export async function sendTransactionWithRetry(
  signer: CannonSigner,
  prepareAndSend: () => Promise<viem.Hash>
): Promise<viem.Hash> {
  return promiseRetry({ retries: 3, minTimeout: 250, factor: 2 }, async (retry, attempt) => {
    try {
      return await prepareAndSend();
    } catch (err) {
      if (err instanceof viem.BaseError && err.walk((e) => e instanceof viem.UserRejectedRequestError)) {
        throw err;
      }

      try {
        const didReset = await resetSignerNonce(signer);
        debug(`broadcast attempt ${attempt} failed${didReset ? ' (reset nonce manager before retry)' : ''}:`, err);
      } catch (resetErr) {
        // a failed reset must not mask the broadcast error; the retried send will report it
        debug('could not reset nonce manager before retry:', resetErr);
      }

      return retry(err);
    }
  });
}
