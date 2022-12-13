import _ from 'lodash';
import fs from 'fs-extra';
import { table } from 'table';
import { bold, greenBright, green, dim, red } from 'chalk';
import tildify from 'tildify';
import {
  associateTag,
  CANNON_CHAIN_ID,
  ChainBuilder,
  ChainDefinition,
  ContractArtifact,
  downloadPackagesRecursive,
  Events,
  patchDeploymentManifest,
  getPackageDir,
} from '@usecannon/builder';
import { findPackage, loadCannonfile } from '../helpers';
import { getProvider, CannonRpcNode } from '../rpc';
import { PackageDefinition } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import { writeModuleDeployments } from '../util/write-deployments';
import { CannonRegistry } from '@usecannon/builder';

interface Params {
  node: CannonRpcNode;
  cannonfilePath?: string;
  packageDefinition: PackageDefinition;
  upgradeFrom?: string;

  getArtifact?: (name: string) => Promise<ContractArtifact>;
  cannonDirectory: string;
  projectDirectory?: string;
  preset?: string;
  forkUrl?: string;
  chainId?: number;
  registry: CannonRegistry;
  wipe?: boolean;
  persist?: boolean;
  deploymentPath?: string;
}

export async function build({
  node,
  cannonfilePath,
  packageDefinition,
  upgradeFrom,
  getArtifact,
  cannonDirectory,
  projectDirectory,
  preset = 'main',
  registry,
  wipe = false,
  persist = true,
  deploymentPath,
}: Params) {
  if (wipe && upgradeFrom) {
    throw new Error('wipe and upgradeFrom are mutually exclusive. Please specify one or the other');
  }

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
    chainId: CANNON_CHAIN_ID,
    baseDir: projectDirectory,
    savedPackagesDir: cannonDirectory,
    // if building locally, override the package directory to be an alternate to prevent clashing with registry packages or other sources
    overridePackageDir: persist
      ? getPackageDir(cannonDirectory, '@local', `${packageDefinition.name}/${packageDefinition.version}`)
      : undefined,
    async getSigner(addr: string) {
      // on test network any user can be conjured
      await provider.send('hardhat_impersonateAccount', [addr]);
      await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
      return provider.getSigner(addr);
    },
    getArtifact,
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
      cannonDirectory
    );
  }

  // try to download any existing published artifacts for this bundle itself before we build it
  if (!wipe) {
    try {
      await registry.downloadFullPackage(
        upgradeFrom || `${packageDefinition.name}:${packageDefinition.version}`,
        cannonDirectory
      );
      console.log('Downloaded package from registry');
    } catch (err: any) {
      if (upgradeFrom) {
        throw new Error(`could not download package definition for upgradeFrom "${upgradeFrom}": ` + err.toString());
      } else {
        console.log('No existing build found on-chain for this package.');
      }
    }
  }

  if (upgradeFrom && persist) {
    console.log('Upgrade from', upgradeFrom);

    const [upgradeFromName, upgradeFromTag] = upgradeFrom.split(':');

    if (fs.existsSync(builder.packageDir)) {
      await fs.remove(builder.packageDir);
    }

    await fs.copy(getPackageDir(builder.packagesDir, upgradeFromName, upgradeFromTag), builder.packageDir);

    await patchDeploymentManifest(builder.packageDir, { upgradeFrom });
  }

  builder.on(Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
  builder.on(Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
  builder.on(Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));
  builder.on(Events.DeployExtra, (n, v) => console.log(`extra data ${n} (${v})`));

  const outputs = await builder.build(packageDefinition.settings);

  if (deploymentPath) {
    await writeModuleDeployments(deploymentPath, '', outputs);
  }

  // link the deployment so it can be accessed from elsewhere
  if (persist) {
    await associateTag(
      cannonDirectory,
      '@local',
      `${packageDefinition.name}/${packageDefinition.version}`,
      packageDefinition.name,
      packageDefinition.version
    );
  }

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
