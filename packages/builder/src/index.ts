// prevent dumb bugs
if (!Object.prototype.hasOwnProperty.call(BigInt.prototype, 'toJSON')) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

export { createInitialContext, build, getArtifacts, addOutputsToContext, getOutputs } from './builder';
export { computeTemplateAccesses, mergeTemplateAccesses } from './access-recorder';
export { registerAction, ActionKinds } from './actions';
export type { CannonAction, RawChainDefinition } from './actions';
export { ChainDefinition } from './definition';
export { ChainBuilderRuntime, CannonStorage, Events } from './runtime';
export type { CannonLoader } from './loader';
export { IPFSLoader, InMemoryLoader } from './loader';
export { decodeTxError, renderTrace, findContract } from './trace';
export type { TraceEntry } from './trace';
export { traceActions, CannonError } from './error';
export { prepareMulticall } from './multicall';
export { CannonRegistry, OnChainRegistry, InMemoryRegistry, FallbackRegistry } from './registry';
export * from './package';
export {
  CANNON_CHAIN_ID,
  getCannonRepoRegistryUrl,
  BUILD_VERSION,
  DEFAULT_REGISTRY_CONFIG,
  DEFAULT_REGISTRY_ADDRESS,
} from './constants';
export * from './ipfs';
export * from './access-recorder';
export * from './definition';
export * from './helpers';
export * from './package-reference';
export * from './util';
export * from './types';
export * from './schemas';
export * from './utils/template';
export { storeRead, storeWrite } from './utils/onchain-store';
