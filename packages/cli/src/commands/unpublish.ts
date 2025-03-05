import { OnChainRegistry, PackageReference, DEFAULT_REGISTRY_CONFIG } from '@usecannon/builder';
import { blueBright, green, bold } from 'chalk';
import _ from 'lodash';
import prompts from 'prompts';
import * as viem from 'viem';
import { LocalRegistry } from '../registry';
import { CliSettings } from '../settings';
import { resolveProviderAndSigners, ProviderAction } from '../util/provider';
import { log } from '../util/console';

interface Options {
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasLimit?: number;
  value?: string;
}

interface Params {
  cliSettings: CliSettings;
  options: Options;
  fullPackageRef: string;
  chainId: number;
}

export async function unpublish({ cliSettings, options, fullPackageRef, chainId }: Params) {
  const { name: packageName, version: packageVersion, preset: packagePreset } = new PackageReference(fullPackageRef);

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
    cliSettings.registries[0].rpcUrl = ['http://127.0.0.1:9546'];
    // anvil mainnet fork
    cliSettings.registries[1].rpcUrl = ['http://127.0.0.1:9545'];
  }

  // initialized optimism as the default registry
  let [writeRegistry] = cliSettings.registries;

  if (!cliSettings.isE2E) {
    const choices = cliSettings.registries.map((p) => ({
      title: `${p.name ?? 'Unknown Network'} (Chain ID: ${p.chainId})`,
      value: p,
    }));

    // override writeRegistry with the picked provider
    writeRegistry = (
      await prompts([
        {
          type: 'select',
          name: 'writeRegistry',
          message: 'Which registry would you like to use? (Cannon will find the package on either):',
          choices,
        },
      ])
    ).writeRegistry;

    log();
  }

  log(bold(`Resolving connection to ${writeRegistry.name} (Chain ID: ${writeRegistry.chainId})...`));

  const readRegistry = _.differenceWith(cliSettings.registries, [writeRegistry], _.isEqual)[0];
  const registryProviders = await Promise.all([
    // write to picked provider
    resolveProviderAndSigners({
      chainId: writeRegistry.chainId!,
      privateKey: cliSettings.privateKey!,
      checkProviders: writeRegistry.rpcUrl,
      action: ProviderAction.WriteProvider,
    }),
    // read from the other one
    resolveProviderAndSigners({
      chainId: readRegistry.chainId!,
      checkProviders: readRegistry.rpcUrl,
      action: ProviderAction.ReadProvider,
    }),
  ]);

  const [writeRegistryProvider] = registryProviders;

  const registryAddress =
    cliSettings.registries.find((registry) => registry.chainId === writeRegistryProvider.provider.chain?.id)?.address ||
    DEFAULT_REGISTRY_CONFIG[0].address;

  const onChainRegistry = new OnChainRegistry({
    signer: writeRegistryProvider.signers[0],
    provider: writeRegistryProvider.provider,
    address: registryAddress,
    overrides,
  });

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  let deploys;
  if (packageName && packageVersion && packagePreset) {
    // if user has specified a full package ref, use it to fetch the deployment
    deploys = [{ name: fullPackageRef, chainId: chainId }];
  } else {
    // check for deployments that are relevant to the provided packageRef
    deploys = await localRegistry.scanDeploys(fullPackageRef, chainId);
  }

  if (!deploys || deploys.length === 0) {
    throw new Error(
      `Could not find any deployments for ${fullPackageRef} with chain id ${chainId}. If you have the IPFS hash of the deployment data, use the fetch command. Otherwise, rebuild the package.`
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
    log();

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
      log('You must select a package to unpublish');
      process.exit(1);
    }

    selectedDeploys = prompt.value;
  } else {
    selectedDeploys = publishedDeploys;
  }

  log();
  log(
    `\nUnpublish Transaction Settings\n - Max Fee Per Gas: ${
      overrides.maxFeePerGas ? overrides.maxFeePerGas.toString() : 'default'
    }\n - Max Priority Fee Per Gas: ${
      overrides.maxPriorityFeePerGas ? overrides.maxPriorityFeePerGas.toString() : 'default'
    }\n - Gas Limit: ${overrides.gasLimit ? overrides.gasLimit : 'default'}\n` +
      "To alter these settings use the parameters '--max-fee-per-gas', '--max-priority-fee-per-gas', '--gas-limit'.\n"
  );

  log();
  log('Submitting transaction, waiting for transaction to succeed...');
  log();

  if (selectedDeploys.length > 1) {
    const [hash] = await onChainRegistry.unpublishMany(selectedDeploys);

    log(`${green('Success!')} (${blueBright('Transaction Hash')}: ${hash})`);
  } else {
    const [deploy] = selectedDeploys;
    const hash = await onChainRegistry.unpublish(deploy.name, deploy.chainId);

    log(`${green('Success!')} (${blueBright('Transaction Hash')}: ${hash})`);
  }
}
