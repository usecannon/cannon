import { DeploymentInfo, CannonStorage, PackageReference, BundledOutput, forPackageTree } from '@usecannon/builder';
import Debug from 'debug';

import { pinIpfs } from '@usecannon/builder/dist/src/package';

const debug = Debug('cannon:cli:pin');
export interface PinnedPackages {
  packagesNames: string[];
  chainId: number;
  url: string;
  metaUrl: string;
}

export async function pin(ipfsUrl: string, fromStorage: CannonStorage, toStorage: CannonStorage) {
  const alreadyCopiedIpfs = new Map<string, any>();

  // this internal function will copy one package's ipfs records and return a publish call, without recursing
  const pinPackagesToIpfs = async (deployInfo: DeploymentInfo, context: BundledOutput | null) => {
    return await pinIpfs(deployInfo, context, fromStorage, toStorage, alreadyCopiedIpfs, []);
  };

  const deployData: DeploymentInfo = await fromStorage.readBlob(ipfsUrl);

  if (!deployData) {
    throw new Error(
      `could not find deployment artifact the given IPFS hash "${ipfsUrl}". Please double check your settings, and rebuild your package.`
    );
  }

  const packageReference = PackageReference.from(deployData.def.name, deployData.def.version, deployData.def.preset);

  debug(
    `pin package ${packageReference.fullPackageRef} (${fromStorage.registry.getLabel()} -> ${toStorage.registry.getLabel()})`
  );

  const calls: PinnedPackages[] = (await forPackageTree(fromStorage, deployData, pinPackagesToIpfs)).filter((v: any) => !!v);

  return calls;
}
