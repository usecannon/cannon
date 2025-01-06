import { ChainDefinition, RawChainDefinition } from '@usecannon/builder';

interface WorkerResponse {
  allActionNames: string[];
  resolvedDependencies: [string, string[]][];
  error?: string;
}

export const getChainDefinitionFromWorker = (deployInfo: RawChainDefinition) => {
  return new Promise<{ allActionNames: string[]; resolvedDependencies: Map<string, string[]> }>((resolve, reject) => {
    const worker = new Worker(new URL('@/workers/chain-definition.worker.ts', import.meta.url));

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if ('error' in event.data) {
        worker.terminate();
        // in case of error, fallback to non-worker execution
        const def = new ChainDefinition(deployInfo);
        def.initializeComputedDependencies();
        resolve({
          allActionNames: def.allActionNames,
          resolvedDependencies: def.resolvedDependencies,
        });
      } else {
        worker.terminate();
        // Convert the array of entries back to a Map
        resolve({
          allActionNames: event.data.allActionNames,
          resolvedDependencies: new Map(event.data.resolvedDependencies),
        });
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
