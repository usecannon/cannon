import _ from 'lodash';
import { table } from 'table';
import { bold, greenBright, green, dim, red } from 'chalk';
import tildify from 'tildify';
import {
  CANNON_CHAIN_ID,
  ChainDefinition,
  ContractArtifact,
  Events,
  IPFSChainBuilderRuntime,
  build as cannonBuild,
  createInitialContext,
  getOutputs
} from '@usecannon/builder';
import { findPackage, loadCannonfile } from '../helpers';
import { getProvider, CannonRpcNode } from '../rpc';
import { PackageSpecification } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import { CannonRegistry } from '@usecannon/builder';
import { resolveCliSettings } from '../settings';
import { createDefaultReadRegistry } from '../registry';

interface Params {
  node: CannonRpcNode;
  cannonfilePath?: string;
  packageDefinition: PackageSpecification;
  upgradeFrom?: string;

  getArtifact?: (name: string) => Promise<ContractArtifact>;
  projectDirectory?: string;
  preset?: string;
  forkUrl?: string;
  chainId?: number;
  overrideResolver?: CannonRegistry;
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
  projectDirectory,
  preset = 'main',
  overrideResolver,
  wipe = false,
  persist = true
}: Params) {
  if (wipe && upgradeFrom) {
    throw new Error('wipe and upgradeFrom are mutually exclusive. Please specify one or the other');
  }

  const cliSettings = resolveCliSettings();

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
    def = new ChainDefinition(findPackage(cliSettings.cannonDirectory, packageDefinition.name, packageDefinition.version).def);
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

  const provider = await getProvider(node);

  const runtimeOptions = {
    name: packageDefinition.name,
    version: packageDefinition.version,
    def,
    preset,

    provider,
    chainId: CANNON_CHAIN_ID,
    async getSigner(addr: string) {
      // on test network any user can be conjured
      await provider.send('hardhat_impersonateAccount', [addr]);
      await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
      return provider.getSigner(addr);
    },

    baseDir: projectDirectory || null,
    snapshots: true,
  };

  const resolver = overrideResolver || createDefaultReadRegistry(cliSettings);

  const runtime = new IPFSChainBuilderRuntime(runtimeOptions, cliSettings.ipfsUrl, resolver);

  runtime.on(Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
  runtime.on(Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
  runtime.on(Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));
  runtime.on(Events.DeployExtra, (n, v) => console.log(`extra data ${n} (${v})`));


  let oldDeployData = null;
  try {
    oldDeployData = await runtime.readDeploy(`${packageDefinition.name}:${packageDefinition.version}`, preset || 'main');
  } catch (err) {
    // do nothing
  }

  const initialCtx = await createInitialContext(def, {}, _.assign(oldDeployData?.options ?? {}, packageDefinition.settings));

  const newState = await cannonBuild(
    runtime, 
    def, 
    oldDeployData ? oldDeployData.state : {}, 
    initialCtx
  );

  const outputs = (await getOutputs(runtime, def, newState))!;

  // save the state to ipfs
  const miscUrl = await runtime.recordMisc();

  const deployUrl = await runtime.putDeploy({
    def: def.toJson(),
    state: newState,
    options: packageDefinition.settings,
    miscUrl: miscUrl
  });

  if (persist) {
    await resolver.publish([`${packageDefinition.name}:${packageDefinition.version}`], deployUrl, `${runtime.chainId}-${preset}`);
  }

  printChainBuilderOutput(outputs);

  console.log(
    greenBright(
      `Successfully built package ${bold(`${packageDefinition.name}:${packageDefinition.version}`)} to ${bold(
        tildify(cliSettings.cannonDirectory)
      )}`
    )
  );

  provider.artifacts = outputs;

  return { outputs, provider };
}
