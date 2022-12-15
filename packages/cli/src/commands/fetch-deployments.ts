import { magentaBright } from 'chalk';
import {
  ChainBuilder,
  downloadPackagesRecursive,
  getAllDeploymentInfos,
  getPackageDir,
  getSavedPackagesDir,
} from '@usecannon/builder';
import { PackageDefinition } from '../types';
import { setupAnvil } from '../helpers';
import { CannonRpcNode, getProvider } from '../rpc';
import createRegistry from '../registry';
import { resolve } from 'path';
import { build } from './build';
import _ from 'lodash';
import { writeModuleDeployments } from '../util/write-deployments';

export interface FetchDeploymentsOptions {
  node: CannonRpcNode;
  output?: string;
  preset: string;
  cannonDirectory: string;
  projectDirectory?: string;
  registryIpfsUrl: string;
  registryRpcUrl: string;
  registryAddress: string;
}

export async function fetchDeployments(packages: PackageDefinition[], options: FetchDeploymentsOptions) {
  await setupAnvil();

  // Start the rpc server
  const node = options.node;
  const provider = await getProvider(node);

  const networkInfo = await provider.getNetwork();

  const registry = createRegistry({
    registryAddress: options.registryAddress,
    registryRpc: options.registryRpcUrl,
    ipfsUrl: options.registryIpfsUrl,
  });

  for (const pkg of packages) {
    const name = `${pkg.name}:${pkg.version}`;
    console.log(magentaBright(`Downloading ${name}...`));
    await downloadPackagesRecursive(name, networkInfo.chainId, options.preset, registry, provider, options.cannonDirectory);
  }

  for (const pkg of packages) {
    const { name, version } = pkg;

    const manifest = await getAllDeploymentInfos(getPackageDir(getSavedPackagesDir(), name, version));

    if (node.forkUrl) {
      console.log(magentaBright(`Fork-deploying ${name}:${version}...`));

      const getSigner = async (addr: string) => {
        // on test network any user can be conjured
        await provider.send('hardhat_impersonateAccount', [addr]);
        await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);

        return provider.getSigner(addr);
      };

      const builder = new ChainBuilder({
        name: pkg.name,
        version: pkg.version,
        def: manifest.deploys[networkInfo.chainId.toString()]['main'].def || manifest.def,
        preset: options.preset,

        readMode: 'metadata',
        writeMode: 'none',

        provider,
        chainId: networkInfo.chainId,
        baseDir: options.projectDirectory,
        savedPackagesDir: options.cannonDirectory,
        getSigner,
        getDefaultSigner: () => getSigner('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'),
      });

      // we want to preserve the same options on build (unless they are overridden with the run configuration)
      const outputs = await builder.build(
        _.assign(manifest.deploys[networkInfo.chainId.toString()]['main'].options, pkg.settings)
      );

      // ensure the provider will be aware of all the artifacts (for now just merge them together)
      // TODO: if two packages have contracts or etc. same name artifacts will get mangled together
      // so perhaps we could just merge them together onto a virtual "super" cannon package?
      _.assign(provider.artifacts, outputs);

      const deploymentPath = options.output ? resolve(options.output) : undefined;
      if (deploymentPath) {
        await writeModuleDeployments(deploymentPath, '', outputs);
      }
    } else {
      // make sure we are building with actual preset settings
      pkg.settings = _.assign(manifest.deploys[networkInfo.chainId.toString()]['main'].options, pkg.settings);

      await build({
        ...options,
        packageDefinition: pkg,
        node,
        registry,
        preset: options.preset,
        persist: false,
        deploymentPath: options.output ? resolve(options.output) : undefined,
      });
    }

    console.log(magentaBright(`\nFetched deployment data for ${name}:${version} to ${options.output}`));
  }
}
