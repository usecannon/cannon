import _ from 'lodash';
import ethers from 'ethers';
import { table } from 'table';
import { bold, greenBright, green, dim, red, yellow, blueBright } from 'chalk';
import {
  CANNON_CHAIN_ID,
  ChainDefinition,
  ContractArtifact,
  Events,
  ChainBuilderRuntime,
  build as cannonBuild,
  createInitialContext,
  getOutputs,
  DeploymentInfo,
  CannonWrapperGenericProvider,
  IPFSLoader,
} from '@usecannon/builder';
import { loadCannonfile } from '../helpers';
import { PackageSpecification } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import { CannonRegistry } from '@usecannon/builder';
import { resolveCliSettings } from '../settings';
import { createDefaultReadRegistry } from '../registry';

interface Params {
  provider: CannonWrapperGenericProvider;
  cannonfilePath?: string;
  packageDefinition: PackageSpecification;
  upgradeFrom?: string;

  getArtifact?: (name: string) => Promise<ContractArtifact>;
  getSigner?: (addr: string) => Promise<ethers.Signer>;
  getDefaultSigner?: () => Promise<ethers.Signer>;
  projectDirectory?: string;
  preset?: string;
  chainId?: number;
  overrideResolver?: CannonRegistry;
  wipe?: boolean;
  persist?: boolean;
  deploymentPath?: string;
}

export async function build({
  provider,
  cannonfilePath,
  packageDefinition,
  upgradeFrom,
  getArtifact,
  getSigner,
  getDefaultSigner,
  projectDirectory,
  preset = 'main',
  overrideResolver,
  wipe = false,
  persist = true,
}: Params) {
  if (wipe && upgradeFrom) {
    throw new Error('wipe and upgradeFrom are mutually exclusive. Please specify one or the other');
  }

  const cliSettings = resolveCliSettings();

  const chainId = (await provider.getNetwork()).chainId;

  const runtimeOptions = {
    name: packageDefinition.name,
    version: packageDefinition.version,
    preset,

    provider,
    chainId,

    getArtifact,

    getSigner:
      getSigner ||
      async function (addr: string) {
        // on test network any user can be conjured
        await provider.send('hardhat_impersonateAccount', [addr]);
        await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
        return provider.getSigner(addr);
      },

    getDefaultSigner,

    baseDir: projectDirectory || null,
    snapshots: chainId === CANNON_CHAIN_ID,
  };

  const resolver = overrideResolver || createDefaultReadRegistry(cliSettings);

  const runtime = new ChainBuilderRuntime(runtimeOptions, new IPFSLoader(cliSettings.ipfsUrl, resolver));

  runtime.on(Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
  runtime.on(Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
  runtime.on(Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));
  runtime.on(Events.DeployExtra, (n, v) => console.log(`extra data ${n} (${v})`));

  let oldDeployData: DeploymentInfo | null = null;
  if (!wipe) {
    console.log(blueBright('downloading IPFS (this can take some time...)'));
    oldDeployData = await runtime.readDeploy(`${packageDefinition.name}:${packageDefinition.version}`, preset || 'main');

    if (oldDeployData) {
      await runtime.restoreMisc(oldDeployData.miscUrl);
    }
  }
  console.log(oldDeployData ? 'loaded previous deployment' : 'did not find previous deployment');

  let def: ChainDefinition;
  if (cannonfilePath) {
    const { def: overrideDef, name, version } = await loadCannonfile(cannonfilePath);

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
  } else if (oldDeployData) {
    def = new ChainDefinition(oldDeployData.def);
  } else {
    throw new Error(
      red(
        'No deployment definition found. Make sure you have a recorded deployment for the requested cannon package, or supply a cannonfile to build one.'
      )
    );
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

  const initialCtx = await createInitialContext(def, {}, _.assign(oldDeployData?.options ?? {}, packageDefinition.settings));

  const newState = await cannonBuild(runtime, def, oldDeployData ? oldDeployData.state : {}, initialCtx);

  const outputs = (await getOutputs(runtime, def, newState))!;

  // save the state to ipfs
  const miscUrl = await runtime.recordMisc();

  if (miscUrl) {
    const deployUrl = await runtime.loader.putDeploy({
      def: def.toJson(),
      state: newState,
      options: packageDefinition.settings,
      miscUrl: miscUrl,
    });

    if (persist) {
      await resolver.publish(
        [`${packageDefinition.name}:${packageDefinition.version}`],
        `${runtime.chainId}-${preset}`,
        deployUrl!
      );
    }

    console.log(
      greenBright(
        `Successfully built package ${bold(`${packageDefinition.name}:${packageDefinition.version}`)} (${deployUrl})`
      )
    );
  } else {
    console.log(
      bold(
        yellow(
          'Chain state could not be saved. For best performance and usage, please follow our guide https://TODOTODO to set up your IPFS connection.'
        )
      )
    );
  }

  printChainBuilderOutput(outputs);

  provider.artifacts = outputs;

  return { outputs, provider };
}
