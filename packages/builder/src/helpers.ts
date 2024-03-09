import { getArtifacts } from './builder';
import { CANNON_CHAIN_ID, getCannonRepoRegistryUrl } from './constants';
import { ChainDefinition } from './definition';
import { IPFSLoader } from './loader';
import { PackageReference } from './package';
import { InMemoryRegistry } from './registry';
import { CannonStorage } from './runtime';
import { getContractFromPath } from './util';

export function getDefaultStorage() {
  return new CannonStorage(new InMemoryRegistry(), { ipfs: new IPFSLoader(getCannonRepoRegistryUrl()) });
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
