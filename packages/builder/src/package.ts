import Debug from 'debug';
import { StepState } from './types';
import { CannonLoader } from './loader';
import { ChainDefinition } from './definition';
import { createInitialContext } from './builder';
const debug = Debug('cannon:cli:publish');

export async function copyPackage({ packageRef, tags, variant, fromLoader, toLoader, recursive}: {
  packageRef: string,
  variant: string,
  tags: string[],
  fromLoader: CannonLoader,
  toLoader: CannonLoader,
  recursive?: boolean,
}): Promise<string[]> {
  debug(`copy package ${packageRef} (${fromLoader.getLabel()} -> ${toLoader.getLabel()})`);

  const registrationReceipts: string[] = [];

  const deployData = await fromLoader.readDeploy(packageRef, variant.split('-')[1], parseInt(variant.split('-')[0]));

  if (!deployData) {
    throw new Error(
      'ipfs could not find deployment artifact. please double check your settings, and rebuild your package.'
    );
  }

  if (recursive) {
    for (const stepState of Object.entries(deployData.state || {})) {
      for (const importArtifact of Object.entries((stepState[1] as StepState).artifacts.imports || {})) {
        if (importArtifact[1].url) {
          // copy package nested
          registrationReceipts.push(...await copyPackage({
            packageRef,
            variant,
            tags: importArtifact[1].tags || [],
            fromLoader,
            toLoader,
            recursive
          }));
        }
      }
    }
  }

  const miscUrl = await toLoader.putMisc(await fromLoader.readMisc(deployData!.miscUrl));

  const metaUrl = await fromLoader.resolver.getMetaUrl(packageRef, variant);
  let newMetaUrl = metaUrl;

  if (metaUrl) {
    newMetaUrl = await toLoader.putMisc(await fromLoader.readMisc(metaUrl));
  }
  const url = await toLoader.putDeploy(deployData!);

  if (!url ||/*url !== toPublishUrl || */newMetaUrl !== metaUrl || miscUrl !== deployData.miscUrl) {
    throw new Error('re-deployed urls do not match up');
  }

  const def = new ChainDefinition(deployData.def);
  const preCtx = await createInitialContext(def, deployData.meta, 0, deployData.options);

  registrationReceipts.push(
    ...await toLoader.resolver.publish(
      [def.getVersion(preCtx), ...tags].map((t) => `${def.getName(preCtx)}:${t}`),
      variant,
      url,
      metaUrl || undefined
    )
  );

  return registrationReceipts;
}