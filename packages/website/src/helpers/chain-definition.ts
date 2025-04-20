import { ChainDefinition, RawChainDefinition } from '@usecannon/builder';

let worker: Worker | null = null;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('@/workers/chain-definition.worker.ts', import.meta.url));
  }
  return worker;
}

export const getChainDefinitionFromWorker = (deployInfo: RawChainDefinition) => {
  return new Promise<ChainDefinition>((resolve, reject) => {
    const currentWorker = getWorker();

    const cleanup = () => {
      currentWorker.removeEventListener('message', handleMessage);
      currentWorker.removeEventListener('error', handleError);
      clearTimeout(timeoutId);
    };

    const handleMessage = (event: MessageEvent) => {
      cleanup();
      if ('error' in event.data) {
        // Fallback to non-worker execution
        const def = new ChainDefinition(deployInfo);
        def.initializeComputedDependencies();
        resolve(def);
      } else {
        resolve(event.data);
      }
    };

    const handleError = (error: ErrorEvent) => {
      cleanup();
      reject(error);
    };

    currentWorker.addEventListener('message', handleMessage);
    currentWorker.addEventListener('error', handleError);

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Worker timed out after 1 minute'));
    }, 60000);

    currentWorker.postMessage(deployInfo);
  });
};
