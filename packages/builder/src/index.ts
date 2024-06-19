export { createInitialContext, build, getArtifacts, getOutputs } from './builder';
export { computeTemplateAccesses, mergeTemplateAccesses } from './access-recorder';
export { registerAction } from './actions';
export type { CannonAction, RawChainDefinition } from './actions';
export { ChainDefinition } from './definition';
export { ChainBuilderRuntime, CannonStorage, Events } from './runtime';
export type { CannonLoader } from './loader';
export { IPFSLoader, InMemoryLoader } from './loader';
export { decodeTxError, renderTrace, findContract } from './trace';
export type { TraceEntry } from './trace';
export { traceActions } from './error';
export { prepareMulticall } from './multicall';

// prevent dumb bugs
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export { CannonRegistry, OnChainRegistry, InMemoryRegistry, FallbackRegistry } from './registry';
export { publishPackage, PackageReference, preparePublishPackage } from './package';
export type { PackagePublishCall } from './package';
export {
  CANNON_CHAIN_ID,
  getCannonRepoRegistryUrl,
  BUILD_VERSION,
  DEFAULT_REGISTRY_CONFIG,
  DEFAULT_REGISTRY_ADDRESS,
} from './constants';
export { isIpfsGateway } from './ipfs';
export * from './access-recorder';
export * from './definition';
export * from './helpers';
export * from './util';
export * from './types';
