import { ChainDefinition, RawChainDefinition } from '@usecannon/builder';

export const getChainDefinitionFromWorker = (deployInfo: RawChainDefinition) => {
  return new Promise<ChainDefinition>((resolve, reject) => {
    const worker = new Worker(new URL('@/workers/chain-definition.worker.ts', import.meta.url));

    worker.onmessage = (event) => {
      if ('error' in event.data) {
        worker.terminate();
        // in case of error, fallback to non-worker execution
        const def = new ChainDefinition(deployInfo);
        def.initializeComputedDependencies();
        resolve(def);
      } else {
        worker.terminate();
        resolve(event.data);
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Worker timed out after 1 minute'));
    }, 60000);

    worker.postMessage(deployInfo);

    // clear timeout if worker completes
    return () => clearTimeout(timeout);
  });
};
