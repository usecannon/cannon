import * as viem from 'viem';
import { mainnet, optimism } from 'viem/chains';
import { getArtifacts } from './builder';
import { CANNON_CHAIN_ID, getCannonRepoRegistryUrl, DEFAULT_REGISTRY_CONFIG, DEFAULT_REGISTRY_ADDRESS } from './constants';
import { ChainDefinition } from './definition';
import { IPFSLoader } from './loader';
import { PackageReference } from './package';
import { OnChainRegistry, FallbackRegistry, InMemoryRegistry } from './registry';
import { CannonStorage } from './runtime';
import { getContractFromPath } from './util';

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

  const artifacts = getArtifacts(new ChainDefinition(deployInfo.def), deployInfo.state);

  const contract = getContractFromPath(artifacts, args.contractName);

  if (!contract) {
    throw new Error(
      `requested contract ${args.contractName} not found in cannon package: ${args.package} (${args.chainId})`
    );
  }

  return contract;
}
