import { ChainDefinition, RawChainDefinition } from '@usecannon/builder';

export const getChainDefinitionFromWorker = (deployInfo: RawChainDefinition) => {
  return new Promise<ChainDefinition>((resolve, reject) => {
    const worker = new Worker(new URL('@/workers/chain-definition.worker.ts', import.meta.url));

    worker.onmessage = (event) => {
      if ('error' in event.data) {
        worker.terminate();
        reject(new Error(event.data.error));
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
      reject(new Error('Worker timed out after 20 seconds'));
    }, 20000);

    worker.postMessage(deployInfo);

    // clear timeout if worker completes
    return () => clearTimeout(timeout);
  });
};
