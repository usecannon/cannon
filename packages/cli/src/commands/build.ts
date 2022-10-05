import _ from 'lodash';
import { table } from 'table';
import { bold, greenBright, green, dim, red } from 'chalk';
import tildify from 'tildify';
import { ChainBuilder, ChainDefinition, ContractArtifact, downloadPackagesRecursive, Events } from '@usecannon/builder';
import { findPackage, loadCannonfile } from '../helpers';
import { runRpc, getProvider } from '../rpc';
import { ChainId, PackageDefinition } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import createRegistry from '../registry';

interface Params {
  node: Awaited<ReturnType<typeof runRpc>>;
  cannonfilePath?: string;
  packageDefinition: PackageDefinition;

  getArtifact?: (name: string) => Promise<ContractArtifact>;
  cannonDirectory: string;
  projectDirectory?: string;
  preset?: string;
  forkUrl?: string;
  chainId?: ChainId;
  registryIpfsUrl: string;
  registryIpfsAuthorizationHeader?: string;
  registryRpcUrl: string;
  registryAddress: string;
  wipe?: boolean;
  persist?: boolean;
}

export async function build({
  node,
  cannonfilePath,
  packageDefinition,
  getArtifact,
  cannonDirectory,
  projectDirectory,
  preset = 'main',
  chainId = 31337,
  registryIpfsUrl,
  registryIpfsAuthorizationHeader,
  registryRpcUrl,
  registryAddress,
  wipe = false,
  persist = true,
}: Params) {
  let def: ChainDefinition;
  if (cannonfilePath) {
    const { def: overrideDef, name, version } = loadCannonfile(cannonfilePath);

    if (!name) {
      throw new Error(red('Your cannonfile is missing a name. Add one to the top of the file like: name = "my-package"'));
    }

    if (!version) {
      throw new Error(red('Your cannonfile is missing a version. Add one to the top of the file like: version = "1.0.0"'));
    }

    if (name !== packageDefinition.name || version !== packageDefinition.version) {
      throw new Error(red('Your cannonfile manifest does not match requseted packageDefinitionDeployment'));
    }

    def = overrideDef;
  } else {
    def = new ChainDefinition(findPackage(cannonDirectory, packageDefinition.name, packageDefinition.version).def);
  }

  const defSettings = def.getSettings();
  if (!packageDefinition.settings && defSettings && !_.isEmpty(defSettings)) {
    const displaySettings = Object.entries(defSettings).map((setting) => [
      setting[0],
      setting[1].defaultValue || dim('No default value'),
      setting[1].description || dim('No description'),
    ]);
    console.log('This package can be built with custom settings.');
    console.log(dim(`Example: npx hardhat cannon:build ${displaySettings[0][0]}="my ${displaySettings[0][0]}"`));
    console.log('\nSETTINGS:');
    console.log(table([[bold('Name'), bold('Default Value'), bold('Description')], ...displaySettings]));
  }

  if (!_.isEmpty(packageDefinition.settings)) {
    console.log(
      green(
        `Creating preset ${bold(preset)} with the following settings: ` +
          Object.entries(packageDefinition.settings)
            .map((setting) => `${setting[0]}=${setting[1]}`)
            .join(' ')
      )
    );
  }

  const readMode = wipe ? 'none' : 'all';
  const writeMode = persist ? 'all' : 'none';

  const provider = await getProvider(node);

  const builder = new ChainBuilder({
    name: packageDefinition.name,
    version: packageDefinition.version,
    def,
    preset,

    readMode,
    writeMode,

    provider,
    chainId,
    baseDir: projectDirectory,
    savedPackagesDir: cannonDirectory,
    async getSigner(addr: string) {
      // on test network any user can be conjured
      await provider.send('hardhat_impersonateAccount', [addr]);
      await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
      return provider.getSigner(addr);
    },
    getArtifact,
  });

  const registry = createRegistry({
    registryAddress: registryAddress,
    registryRpc: registryRpcUrl,
    ipfsUrl: registryIpfsUrl,
    ipfsAuthorizationHeader: registryIpfsAuthorizationHeader,
  });

  const dependencies = await builder.def.getRequiredImports(await builder.populateSettings(packageDefinition.settings));

  for (const dependency of dependencies) {
    console.log(`Loading dependency tree ${dependency.source} (${dependency.chainId}-${dependency.preset})`);
    await downloadPackagesRecursive(
      dependency.source,
      dependency.chainId,
      dependency.preset,
      registry,
      provider,
      builder.packagesDir
    );
  }

  // try to download any existing published artifacts for this bundle itself before we build it
  if (!wipe) {
    try {
      await registry.downloadPackageChain(
        `${packageDefinition.name}:${packageDefinition.version}`,
        chainId,
        preset,
        cannonDirectory
      );
      console.log('Downloaded package from registry');
    } catch (err) {
      console.log('No existing build found on-chain for this package.');
    }
  }

  builder.on(Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
  builder.on(Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
  builder.on(Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));

  const outputs = await builder.build(packageDefinition.settings);

  printChainBuilderOutput(outputs);

  console.log(
    greenBright(
      `Successfully built package ${bold(`${packageDefinition.name}:${packageDefinition.version}`)} to ${bold(
        tildify(cannonDirectory)
      )}`
    )
  );

  provider.artifacts = outputs;

  return { outputs, provider };
}
