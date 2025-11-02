// prevent dumb bugs
if (!Object.prototype.hasOwnProperty.call(BigInt.prototype, 'toJSON')) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

export { createInitialContext, build, getArtifacts, addOutputsToContext, getOutputs } from './builder.js';
export { computeTemplateAccesses, mergeTemplateAccesses } from './access-recorder.js';
export { registerAction, ActionKinds } from './actions.js';
export type { CannonAction, RawChainDefinition } from './actions.js';
export { ChainDefinition } from './definition.js';
export { ChainBuilderRuntime, CannonStorage, Events } from './runtime.js';
export type { CannonLoader } from './loader.js';
export { IPFSLoader, InMemoryLoader } from './loader.js';
export { decodeTxError, renderTrace, findContract } from './trace.js';
export type { TraceEntry } from './trace.js';
export { traceActions, CannonError } from './error/index.js';
export { prepareMulticall } from './multicall.js';
export { CannonRegistry, OnChainRegistry, InMemoryRegistry, FallbackRegistry } from './registry.js';
export * from './package.js';
export {
  CANNON_CHAIN_ID,
  getCannonRepoRegistryUrl,
  BUILD_VERSION,
  DEFAULT_REGISTRY_CONFIG,
  DEFAULT_REGISTRY_ADDRESS,
} from './constants.js';
export * from './ipfs.js';
export * from './access-recorder.js';
export * from './definition.js';
export * from './helpers.js';
export * from './package-reference.js';
export * from './util.js';
export * from './types.js';
export * from './schemas.js';
export * from './utils/template.js';
export { storeRead, storeWrite } from './utils/onchain-store.js';
