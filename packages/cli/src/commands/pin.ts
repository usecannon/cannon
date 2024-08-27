import {
  DeploymentInfo,
  IPFSLoader,
  CannonStorage,
  PackageReference,
  ChainDefinition,
  createInitialContext,
  BundledOutput,
  forPackageTree,
} from '@usecannon/builder';
import Debug from 'debug';

import { getChainIdFromDeployInfo, getPackageReference } from '../helpers';
import _ from 'lodash';

const debug = Debug('cannon:cli:pin');

export interface PinnedPackages {
  packagesNames: string[];
  chainId: number;
  url: string;
  metaUrl: string;
}

export async function pin(hash: string, fromStorage: CannonStorage, toStorage: CannonStorage) {
  const packageReference = new PackageReference(await getPackageReference(hash));
  const chainId = await getChainIdFromDeployInfo(hash);
  
  debug(`pin package ${packageReference} (${fromStorage.registry.getLabel()} -> ${toStorage.registry.getLabel()})`);

  const presetRef = packageReference.preset;
  const givenPackageRef = packageReference.fullPackageRef;

  const alreadyCopiedIpfs = new Map<string, any>();
  // this internal function will copy one package's ipfs records and return a publish call, without recursing
  const pinIpfs = async (deployInfo: DeploymentInfo, context: BundledOutput | null) => {
    const checkKey =
      deployInfo.def.name + ':' + deployInfo.def.version + ':' + deployInfo.def.preset + ':' + deployInfo.timestamp;

    if (alreadyCopiedIpfs.has(checkKey)) {
      return alreadyCopiedIpfs.get(checkKey);
    }

    const def = new ChainDefinition(deployInfo.def);

    const preCtx = await createInitialContext(def, deployInfo.meta, deployInfo.chainId!, deployInfo.options);

    const curFullPackageRef = new PackageReference(
      `${def.getName(preCtx)}:${def.getVersion(preCtx)}@${context && context.preset ? context.preset : presetRef}`
    ).fullPackageRef;

    // if the package has already been published to the registry and it has the same ipfs hash, skip.
    const toUrl = await toStorage.registry.getUrl(curFullPackageRef, chainId);
    debug('toStorage.getLabel: ' + toStorage.getLabel() + ' toUrl: ' + toUrl);

    const fromUrl = await fromStorage.registry.getUrl(curFullPackageRef, chainId);
    debug('fromStorage.getLabel: ' + fromStorage.getLabel() + ' fromUrl: ' + fromUrl);

    if (fromUrl && toUrl === fromUrl) {
      debug('package already published... skip!', curFullPackageRef);
      alreadyCopiedIpfs.set(checkKey, null);
      return null;
    }

    debug('copy ipfs for', curFullPackageRef, toUrl, fromUrl);

    const url = await toStorage.putBlob(deployInfo!);

    // sometimes the from url is not set because only the top level package exists. If that is the case,
    // we want to check the uploaded ipfs blob and if it matches up, then we should cancel
    debug('got updated fromUrl:' + url);
    if (toUrl === url) {
      debug('package already published (via post ipfs upload url)... skip!', curFullPackageRef);
      alreadyCopiedIpfs.set(checkKey, null);
      return null;
    }

    const newMiscUrl = await toStorage.putBlob(await fromStorage.readBlob(deployInfo!.miscUrl));

    if (newMiscUrl !== deployInfo.miscUrl) {
      debug(`WARN new misc url does not match recorded one: ${newMiscUrl} vs ${deployInfo.miscUrl}`);
    }

    // TODO: This metaUrl block is being called on each loop, but it always uses the same parameters.
    //       Should it be called outside the scoped copyIpfs() function?
    const metaUrl = await fromStorage.registry.getMetaUrl(curFullPackageRef, chainId);
    //let newMetaUrl = metaUrl;

    if (metaUrl) {
      // TODO: figure out metaurl handling
      /*newMetaUrl = await toStorage.putBlob(await fromStorage.readBlob(metaUrl));

      if (!newMetaUrl) {
        throw new Error('error while writing new misc blob');
      }*/
    }

    if (!url) {
      throw new Error('uploaded url is invalid');
    }

    const returnVal = {
      packagesNames: _.uniq([def.getVersion(preCtx) || 'latest']).map(
        (t: string) => `${def.getName(preCtx)}:${t}@${context && context.preset ? context.preset : presetRef}`
      ),
      chainId,
      url,
      metaUrl: '',
    };

    alreadyCopiedIpfs.set(checkKey, returnVal);

    return returnVal;
  };

  const deployData = await fromStorage.readDeploy(givenPackageRef, chainId);

  if (!deployData) {
    throw new Error(
      `could not find deployment artifact for ${givenPackageRef} with chain id "${chainId}". Please double check your settings, and rebuild your package.`
    );
  }

  const calls: PinnedPackages[] = (await forPackageTree(fromStorage, deployData, pinIpfs)).filter((v: any) => !!v);

  return calls;
}
