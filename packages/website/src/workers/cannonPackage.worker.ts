import { IPFSBrowserLoader } from '@/helpers/ipfs';
import { ChainDefinition, createInitialContext, DeploymentInfo, PackageReference } from '@usecannon/builder';

// Define message types
export type WorkerMessage = {
  type: 'LOAD_PACKAGE';
  payload: {
    url: string;
    ipfsApiUrl: string;
  };
};

export type WorkerResponsePayload = {
  deployInfo: DeploymentInfo;
  resolvedName: string;
  resolvedVersion: string;
  resolvedPreset: string;
  fullPackageRef: string;
};

export type WorkerResponse =
  | {
      type: 'PACKAGE_LOADED';
      payload: WorkerResponsePayload;
    }
  | {
      type: 'ERROR';
      payload: {
        message: string;
      };
    };

// Handle messages from the main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type === 'LOAD_PACKAGE') {
    try {
      const { url, ipfsApiUrl } = event.data.payload;
      const ipfsLoader = new IPFSBrowserLoader(ipfsApiUrl);

      const deployInfo: DeploymentInfo = await ipfsLoader.read(url as any);
      if (!deployInfo) throw new Error('failed to download package data');

      const def = new ChainDefinition(deployInfo.def);
      const ctx = await createInitialContext(def, deployInfo.meta, 0, deployInfo.options);

      const resolvedName = def.getName(ctx);
      const resolvedVersion = def.getVersion(ctx);
      const resolvedPreset = def.getPreset(ctx);
      const { fullPackageRef } = PackageReference.from(resolvedName, resolvedVersion, resolvedPreset);

      const response: WorkerResponse = {
        type: 'PACKAGE_LOADED',
        payload: {
          deployInfo,
          resolvedName,
          resolvedVersion,
          resolvedPreset,
          fullPackageRef,
        },
      };

      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        type: 'ERROR',
        payload: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      self.postMessage(response);
    }
  }
});
