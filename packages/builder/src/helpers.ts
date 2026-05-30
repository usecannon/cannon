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

const NONCE_ERROR_RE =
  /nonce too low|nonce too high|nonce provided.*is (?:too )?(?:low|high|higher|lower)|invalid (?:transaction )?nonce|replacement transaction underpriced|(?:transaction|tx).*already known|already known.*(?:transaction|tx)/i;

// Detects whether an error (or any error in its `cause` chain) is a nonce-related RPC error.
// viem wraps RPC errors, so the underlying message can live a few levels down in `.cause`.
export function isNonceError(err: unknown): boolean {
  let e: any = err;
  for (let i = 0; e && i < 5; i++) {
    const msg = e.details ?? e.shortMessage ?? e.message ?? '';
    if (NONCE_ERROR_RE.test(String(msg))) return true;
    e = e.cause;
  }
  return false;
}

// Defense-in-depth around a broadcast: runs the prepare+send closure and, on a nonce-class
// error, resets the signer's viem nonce manager (so the next prepare re-reads the chain) and
// retries with exponential backoff. The closure is responsible for (re-)preparing the
// transaction each attempt so a fresh nonce is assigned. Non-nonce errors propagate immediately,
// so the happy path is unchanged.
export async function sendTransactionWithNonceRetry(
  signer: CannonSigner,
  chainId: number,
  prepareAndSend: () => Promise<viem.Hash>
): Promise<viem.Hash> {
  return (await promiseRetry({ retries: 3, minTimeout: 250, factor: 2 }, (retry) =>
    prepareAndSend().catch((err: unknown) => {
      if (!isNonceError(err)) throw err;
      const account: any = (signer.wallet as any).account;
      try {
        account?.nonceManager?.reset?.({ address: account.address, chainId });
      } catch {
        // best-effort: the nonce manager re-reads the chain on the next prepare regardless
      }
      return retry(err);
    })
  )) as viem.Hash;
}
