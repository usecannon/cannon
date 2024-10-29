import { IPFSBrowserLoader } from '@/helpers/ipfs';
import { ChainDefinition, createInitialContext, DeploymentInfo, PackageReference } from '@usecannon/builder';

export type WorkerMessage =
  | {
      type: 'LOAD_PACKAGE';
      payload: {
        url: string;
        ipfsApiUrl: string;
      };
    }
  | {
      type: 'WRITE_DEPLOY';
      payload: {
        deployInfo: DeploymentInfo;
        ipfsApiUrl: string;
        chainId: number;
      };
    };

export type LoadPackageResponse = {
  deployInfo: DeploymentInfo;
  resolvedName: string;
  resolvedVersion: string;
  resolvedPreset: string;
  fullPackageRef: string;
};

export type WriteDeployResponse = {
  packageRef: string;
  mainUrl: string;
};

export type WorkerResponse =
  | {
      type: 'PACKAGE_LOADED';
      payload: LoadPackageResponse;
    }
  | {
      type: 'DEPLOY_WRITTEN';
      payload: WriteDeployResponse;
    }
  | {
      type: 'ERROR';
      payload: {
        message: string;
      };
    };

// handle messages from the main thread
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
  } else if (event.data.type === 'WRITE_DEPLOY') {
    try {
      const { deployInfo, ipfsApiUrl, chainId } = event.data.payload;
      const def = new ChainDefinition(deployInfo.def);
      const ctx = await createInitialContext(def, deployInfo.meta, chainId, deployInfo.options);

      const preset = def.getPreset(ctx);
      const packageRef = PackageReference.from(def.getName(ctx), def.getVersion(ctx), preset).fullPackageRef;

      const ipfsLoader = new IPFSBrowserLoader(ipfsApiUrl);
      const url = await ipfsLoader.put(deployInfo);

      const response: WorkerResponse = {
        type: 'DEPLOY_WRITTEN',
        payload: {
          packageRef,
          mainUrl: url,
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
