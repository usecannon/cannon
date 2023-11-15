import { IPFSLoader, OnChainRegistry, CannonStorage, publishPackage } from '@usecannon/builder';
import { blueBright, gray } from 'chalk';
import { ethers } from 'ethers';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { PackageReference, getProvisionedPackages } from '@usecannon/builder/dist/package';

import { bold, yellow } from 'chalk';
import prompts from 'prompts';

interface Params {
  packageRef: string;
  signer: ethers.Signer;
  tags: string[];
  chainId?: number;
  presetArg?: string;
  quiet?: boolean;
  includeProvisioned?: boolean;
  skipConfirm?: boolean;
  overrides?: ethers.PayableOverrides;
}

interface DeployList {
  name: string;
  versions: string[];
  variant: string;
}

interface SubPackage {
  packagesNames: string[];
  variant: string;
}

export async function publish({
  packageRef,
  signer,
  tags,
  chainId,
  presetArg,
  quiet = false,
  includeProvisioned = false,
  skipConfirm = false,
  overrides,
}: Params) {
  // Ensure publish ipfs url is set
  const cliSettings = resolveCliSettings();
  if (!cliSettings.publishIpfsUrl) {
    throw new Error(
      `In order to publish, a publishIpfsUrl setting must be set in your Cannon configuration. Use '${process.argv[0]} setup' to configure.`
    );
  }

  // Handle deprecated preset specification
  const { preset, basePackageRef } = new PackageReference(packageRef);
  if (presetArg) {
    console.warn(yellow(bold(`The --preset option is deprecated. Reference presets in the format name:version@preset`)));
  }
  const selectedPreset = presetArg || preset;

  if (!quiet) {
    console.log(blueBright(`Publishing with ${await signer.getAddress()}`));
    console.log();
  }

  // Generate CannonStorage to retrieve the local instance of the package
  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
  const fromStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));

  // Generate CannonStorage to publish ipfs remotely and write to the registry
  const onChainRegistry = new OnChainRegistry({
    signerOrProvider: signer,
    address: cliSettings.registryAddress,
    overrides,
  });
  const toStorage = new CannonStorage(onChainRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl),
  });

  // get a list of all deployments the user is requesting
  let variantFilter = /.*/;
  if (chainId && selectedPreset) {
    variantFilter = new RegExp(`^${chainId}-${selectedPreset}$`);
  } else if (chainId) {
    variantFilter = new RegExp(`^${chainId}-.*$`);
  } else if (selectedPreset) {
    variantFilter = new RegExp(`^.*-${selectedPreset}$`);
  }

  const [, version] = packageRef.split(':');

  // if the package reference doesnt contain a version reference we still want to scan deploys without it.
  // This works as a catch all to get any deployment stored locally.
  // However if a version is passed, we use the basePackageRef to extrapolate and remove any potential preset in the reference.
  let deploys;
  if (!version || version.length === 0) {
    deploys = await localRegistry.scanDeploys(packageRef, variantFilter);
  } else {
    deploys = await localRegistry.scanDeploys(basePackageRef, variantFilter);
  }

  if (!deploys || deploys.length === 0) {
    throw new Error(
      `Could not find any deployments for ${packageRef}. If you have the IPFS hash of the deployment data, use fetch command. Otherwise, rebuild the package.`
    );
  } else if (!quiet) {
    console.log('Found deployment networks:', deploys.map((d) => d.variant).join(', '), '\n');
  }

  // Select screen for when a user is looking for all the local deploys
  if (!skipConfirm && (!version || version.length === 0) && deploys.length > 1) {
    const verification = await prompts({
      type: 'autocompleteMultiselect',
      message: 'Select the packages you want to publish:\n',
      name: 'values',
      choices: deploys.map((d) => {
        return {
          title: `${d.name} (preset: ${d.variant.substring(d.variant.indexOf('-') + 1)})`,
          description: '',
          value: d,
        };
      }),
    });

    if (!verification.values || verification.values.length == 0) {
      console.log('You must select a package to publish');
      process.exit(1);
    }

    deploys = verification.values as typeof deploys;
  }

  // Doing some filtering on deploys list so that we can iterate over every "duplicate" package which has more than one version being deployed.
  const deployNames = deploys.map((deploy) => {
    return { name: deploy.name.split(':')[0], version: deploy.name.split(':')[1], variant: deploy.variant };
  });

  // "dedupe" the deploys so that when we iterate we can go over every package deployment by version
  const parentPackages: DeployList[] = deployNames.reduce((result: DeployList[], item) => {
    const matchingDeploys = result.find((i) => i.name === item.name && i.variant === item.variant);

    if (item.version == 'latest' && deploys.length > 1) {
      tags.push(item.version);
      return result;
    }

    if (matchingDeploys) {
      matchingDeploys.versions.push(item.version);
    } else {
      result.push({ name: item.name, versions: [item.version], variant: item.variant });
    }
    return result;
  }, []);

  let subPackages: SubPackage[] = [];
  if (!skipConfirm) {
    if (includeProvisioned) {
      for (const pkg of parentPackages) {
        for (const version of pkg.versions) {
          const provisionedPackages = await getProvisionedPackages(`${pkg.name}:${version}`, pkg.variant, tags, fromStorage);
          subPackages.push(...provisionedPackages);
        }
      }

      // dedupe and reduce to subPackages
      subPackages = subPackages.reduce<SubPackage[]>((acc, curr) => {
        if (
          !acc.some((item) => item.packagesNames !== curr.packagesNames && item.variant === curr.variant) &&
          !curr.packagesNames.some((r) => parentPackages.some((p) => r.includes(`${p.name}`)))
        ) {
          acc.push(curr);
        }
        return acc;
      }, []);

      parentPackages.forEach((deploy) => {
        const preset = deploy.variant.substring(deploy.variant.indexOf('-') + 1);
        console.log(blueBright(`This will publish ${bold(deploy.name)} to the registry:`));
        deploy.versions.concat(tags).map((version) => console.log(`- ${version} (preset: ${preset})`));
      });
      console.log('\n');

      subPackages!.forEach((pkg: SubPackage) => {
        console.log(blueBright(`This will publish ${bold(pkg.packagesNames[0].split(':')[0])} to the registry:`));
        pkg.packagesNames.forEach((pkgName) => {
          const { version } = new PackageReference(pkgName);
          const preset = pkg.variant.substring(pkg.variant.indexOf('-') + 1);
          console.log(`- ${version} (preset: ${preset})`);
        });
      });
      console.log('\n');
    } else {
      const pkgRef = new PackageReference(packageRef);
      console.log(blueBright(`This will publish ${bold(pkgRef.name)} to the registry:`));
      parentPackages.forEach((deploy) => {
        deploy.versions.concat(tags).forEach((tag) => {
          console.log(`- ${tag} (preset: ${deploy.variant.substring(deploy.variant.indexOf('-') + 1)})`);
        });
      });
      console.log('\n');
    }

    const verification = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: 'Proceed?',
      initial: true,
    });

    if (!verification.confirmation) {
      console.log('Cancelled');
      process.exit(1);
    }

    console.log(bold('Publishing package...'));
    console.log(gray('This may take a few minutes.'));
    console.log();
  }

  const registrationReceipts = [];

  for (const pkg of parentPackages) {
    for (const version of pkg.versions) {
      const newReceipts = await publishPackage({
        packageRef: `${pkg.name}:${version}`,
        variant: pkg.variant,
        fromStorage,
        toStorage,
        tags,
        includeProvisioned,
      });

      registrationReceipts.push(...newReceipts);
    }
  }

  if (!quiet) {
    console.log(bold(blueBright('Packages published:')));
    if (includeProvisioned) {
      parentPackages.forEach((deploy) => {
        deploy.versions.concat(tags).forEach((ver) => {
          const { basePackageRef } = new PackageReference(`${deploy.name}:${ver}`);
          const preset = deploy.variant.substring(deploy.variant.indexOf('-') + 1);
          console.log(`- ${basePackageRef} (preset: ${preset})`);
        });
      });
      subPackages!.forEach((pkg) => {
        pkg.packagesNames.forEach((pkgName) => {
          const { basePackageRef } = new PackageReference(pkgName);
          const preset = pkg.variant.substring(pkg.variant.indexOf('-') + 1);
          console.log(`- ${basePackageRef} (preset: ${preset})`);
        });
      });
    } else {
      parentPackages.forEach((deploy) => {
        deploy.versions.concat(tags).forEach((ver) => {
          console.log(`  - ${deploy.name}:${ver}`);
        });
      });
    }

    const txs = registrationReceipts.filter((tx) => !!tx);
    if (txs.length) {
      console.log(blueBright('Transactions:'));
      for (const tx of txs) console.log(`  - ${tx}`);
    }
  }
}
