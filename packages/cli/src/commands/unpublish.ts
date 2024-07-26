import { OnChainRegistry, PackageReference, DEFAULT_REGISTRY_CONFIG } from '@usecannon/builder';
import { blueBright, green } from 'chalk';
import _ from 'lodash';
import prompts from 'prompts';
import * as viem from 'viem';
import { checkAndNormalizePrivateKey, isPrivateKey, normalizePrivateKey } from '../helpers';
import { LocalRegistry } from '../registry';
import { CliSettings } from '../settings';
import { resolveRegistryProviders, ProviderAction } from '../util/provider';

interface Params {
  cliSettings: CliSettings;
  options: any;
  packageRef: string;
}

export async function unpublish({ cliSettings, options, packageRef }: Params) {
  if (!options.chainId) {
    const chainIdPrompt = await prompts({
      type: 'number',
      name: 'value',
      message: 'Please provide the Chain ID for the package you want to unpublish',
      initial: 13370,
    });

    if (!chainIdPrompt.value) {
      throw new Error('A valid Chain Id is required.');
    }

    options.chainId = Number(chainIdPrompt.value);
  }

  console.log();

  const fullPackageRef = new PackageReference(packageRef).fullPackageRef;

  // Get the package name, version, and preset without being defaulted
  const { name: packageName, version: packageVersion, preset: packagePreset } = PackageReference.parse(packageRef);

  const overrides: any = {};

  if (options.maxFeePerGas) {
    overrides.maxFeePerGas = viem.parseGwei(options.maxFeePerGas);
  }
  if (options.gasLimit) {
    overrides.gasLimit = options.gasLimit;
  }
  if (options.value) {
    overrides.value = options.value;
  }

  // if it's using the default config, prompt the user to choose a registry provider
  const isDefaultSettings = _.isEqual(cliSettings.registries, DEFAULT_REGISTRY_CONFIG);
  if (!isDefaultSettings) throw new Error('Custom registry settings are not supported yet.');

  if (cliSettings.isE2E) {
    // anvil optimism fork
    cliSettings.registries[0].providerUrl = ['http://127.0.0.1:9546'];
    // anvil mainnet fork
    cliSettings.registries[1].providerUrl = ['http://127.0.0.1:9545'];
  }

  const registryProviders = await resolveRegistryProviders(cliSettings, ProviderAction.WriteRegistry);
  // initialize pickedRegistryProvider with the first provider
  let [pickedRegistryProvider] = registryProviders;

  const choices = registryProviders.reverse().map((p) => ({
    title: `${p.provider.chain?.name ?? 'Unknown Network'} (Chain ID: ${p.provider.chain?.id})`,
    value: p,
  }));

  // if the execution comes from the e2e tests, don't prompt and use the first one
  if (!cliSettings.isE2E) {
    // override pickedRegistryProvider with the selected provider
    pickedRegistryProvider = (
      await prompts([
        {
          type: 'select',
          name: 'pickedRegistryProvider',
          message: 'Which registry would you like to use? (Cannon will find the package on either.):',
          choices,
        },
      ])
    ).pickedRegistryProvider;
  }

  const registryAddress =
    cliSettings.registries.find((registry) => registry.chainId === pickedRegistryProvider.provider.chain?.id)?.address ||
    DEFAULT_REGISTRY_CONFIG[0].address;

  const onChainRegistry = new OnChainRegistry({
    signer: pickedRegistryProvider.signers[0],
    provider: pickedRegistryProvider.provider,
    address: registryAddress,
    overrides,
  });

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  let deploys;
  if (packageName && packageVersion && packagePreset) {
    // if user has specified a full package ref, use it to fetch the deployment
    deploys = [{ name: fullPackageRef, chainId: options.chainId }];
  } else {
    // check for deployments that are relevant to the provided packageRef
    deploys = await localRegistry.scanDeploys(packageRef, Number(options.chainId));
  }

  if (!deploys || deploys.length === 0) {
    throw new Error(
      `Could not find any deployments for ${fullPackageRef} with chain id ${options.chainId}. If you have the IPFS hash of the deployment data, use the fetch command. Otherwise, rebuild the package.`
    );
  }

  const onChainResults = await Promise.all(
    deploys.map(async (d) => {
      return [await onChainRegistry.getUrl(d.name, d.chainId), await onChainRegistry.getMetaUrl(d.name, d.chainId)];
    })
  );

  const publishedDeploys = deploys.reduce((acc: any[], deploy, index) => {
    const [url, metaUrl] = onChainResults[index];
    // note: name should be an array to be used in _preparePackageData function
    acc.push({ ...deploy, name: [deploy.name], url, metaUrl });

    return acc;
  }, []);

  if (publishedDeploys.length === 0) {
    throw new Error(`Package ${packageName} has no published deployments.`);
  }

  let selectedDeploys;
  if (publishedDeploys.length > 1) {
    console.log();

    const prompt = await prompts({
      type: 'multiselect',
      message: 'Select the packages you want to unpublish:\n',
      name: 'value',
      instructions: false,
      hint: '- Space to select. Enter to submit',
      choices: publishedDeploys.map((d) => {
        const { fullPackageRef } = new PackageReference(d.name[0]);

        return {
          title: `${fullPackageRef} (Chain ID: ${d.chainId})`,
          description: '',
          value: d,
        };
      }),
    });

    if (!prompt.value) {
      console.log('You must select a package to unpublish');
      process.exit(1);
    }

    selectedDeploys = prompt.value;
  } else {
    selectedDeploys = publishedDeploys;
  }

  console.log();
  console.log(
    `\nSettings:\n - Max Fee Per Gas: ${
      overrides.maxFeePerGas ? overrides.maxFeePerGas.toString() : 'default'
    }\n - Max Priority Fee Per Gas: ${
      overrides.maxPriorityFeePerGas ? overrides.maxPriorityFeePerGas.toString() : 'default'
    }\n - Gas Limit: ${overrides.gasLimit ? overrides.gasLimit : 'default'}\n` +
      " - To alter these settings use the parameters '--max-fee-per-gas', '--max-priority-fee-per-gas', '--gas-limit'.\n"
  );

  console.log();
  console.log('Submitting transaction, waiting for transaction to succeed...');
  console.log();

  if (selectedDeploys.length > 1) {
    const [hash] = await onChainRegistry.unpublishMany(selectedDeploys);

    console.log(`${green('Success!')} (${blueBright('Transaction Hash')}: ${hash})`);
  } else {
    const [deploy] = selectedDeploys;
    const hash = await onChainRegistry.unpublish(deploy.name, deploy.chainId);

    console.log(`${green('Success!')} (${blueBright('Transaction Hash')}: ${hash})`);
  }
}
