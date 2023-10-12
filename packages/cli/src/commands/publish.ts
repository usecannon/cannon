import { IPFSLoader, OnChainRegistry, CannonStorage, publishPackage } from '@usecannon/builder';
import { blueBright } from 'chalk';
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
  overrides?: ethers.CallOverrides;
  includeProvisioned?: boolean;
}

interface DeployList {
  name: string;
  versions: string[];
  variant: string;
}

interface ProvisionedPackages {
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
  overrides,
  includeProvisioned = false,
}: Params) {
  const cliSettings = resolveCliSettings();

  if (!cliSettings.publishIpfsUrl) {
    throw new Error(
      `In order to publish, a publishIpfsUrl setting must be set in your Cannon configuration. Use '${process.argv[0]} setup' to configure.`
    );
  }

  const { preset, basePackageRef } = new PackageReference(packageRef);

  if (presetArg && preset) {
    console.warn(
      yellow(
        bold(`Duplicate preset definitions in package reference "${packageRef}" and in --preset argument: "${presetArg}"`)
      )
    );
    console.warn(yellow(bold(`The --preset option is deprecated. Defaulting to package reference "${preset}"...`)));
  }

  const selectedPreset = preset || presetArg || 'main';

  const onChainRegistry = new OnChainRegistry({
    signerOrProvider: signer,
    address: cliSettings.registryAddress,
    overrides,
  });

  if (!quiet) {
    console.log(blueBright('Publishing signer is', await signer.getAddress()));
    console.log('');
  }

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  // get a list of all deployments the user is requesting

  let variantFilter = /.*/;
  if (chainId && (preset || presetArg)) {
    variantFilter = new RegExp(`^${chainId}-${preset || presetArg}$`);
  } else if (chainId) {
    variantFilter = new RegExp(`^${chainId}-.*$`);
  } else if (selectedPreset) {
    variantFilter = new RegExp(`^.*-${selectedPreset}$`);
  }

  const [, version] = packageRef.split(':');

  // if packageRef doesnt contain a version reference we still want to scan deploys without it.
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
      `Could not find any deployments for ${packageRef}, if you have the IPFS hash of the deployment data, run 'fetch ${basePackageRef} <ipfsHash>'. Otherwise rebuild the package and then re-publish`
    );
  }

  if (!quiet) {
    console.log('Found deployment networks:', deploys.map((d) => d.variant).join(', '), '\n');
  }

  // Select screen for when a user is looking for all the local deploys
  if (!quiet && !version || version.length === 0) {  
    const verification = await prompts({
      type: 'autocompleteMultiselect',
      message: 'Select which deployments you want to publish:\n',
      name: 'values',
      choices: deploys.map(d => {return { title: d.name, description: `(preset: ${d.variant.substring(d.variant.indexOf('-') + 1)})`, value: d }}),
    });
    
    if (!verification.values) {
      console.log('Cancelled');
      process.exit(1);
    }

    deploys = verification.values as typeof deploys;
  }

  const fromStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));
  const toStorage = new CannonStorage(onChainRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl || cliSettings.ipfsUrl!),
  });

  const registrationReceipts = [];

  // Doing some filtering on deploys list so that we can iterate over every "duplicate" package which has more than one version being deployed.
  const deployNames = deploys.map((deploy) => {
    return { name: deploy.name.split(':')[0], version: deploy.name.split(':')[1], variant: deploy.variant };
  });

  // "dedupe" the deploys so that when we iterate we dont go over every package deployment by version
  const toDeploy: DeployList[] = deployNames.reduce((result: DeployList[], item) => {
    const matchingDeploys = result.find((i) => i.name === item.name && i.variant === item.variant);

    if (matchingDeploys) {
      matchingDeploys.versions.push(item.version);
    } else {
      result.push({ name: item.name, versions: [item.version], variant: item.variant });
    }
    return result;
  }, []);

  let packages: ProvisionedPackages[] = [];
  let dedupedPackages: ProvisionedPackages[];
  for (const pkg in toDeploy) {
    for (const version in toDeploy[pkg].versions) {
      let provisionedPackages = await getProvisionedPackages(`${toDeploy[pkg].name}:${ toDeploy[pkg].versions[version]}`, toDeploy[pkg].variant, tags, fromStorage);
      packages.push(...provisionedPackages);
    }

    dedupedPackages = packages.reduce<ProvisionedPackages[]>((acc, curr) => {
      if (!acc.some(item => item.packagesNames !== curr.packagesNames && item.variant === curr.variant)) {
        acc.push(curr);
      }
      return acc;
    }, []);
  }


  if (!quiet) {
    if (includeProvisioned) {
      toDeploy.forEach(() => {
        dedupedPackages!.forEach((pkg: { packagesNames: string[]; variant: string }) => {
          console.log(blueBright(`This will publish ${bold(pkg.packagesNames[0])} to the registry:`));
          pkg.packagesNames.forEach((pkgName) => {
            const { version } = new PackageReference(pkgName);
            const preset = pkg.variant.substring(pkg.variant.indexOf('-')+1);
            console.log(`- ${version} (preset: ${preset})`);
          });
        });
      });

      console.log('\n');
    } else {
      const pkgRef = new PackageReference(packageRef);
      console.log(blueBright(`This will publish ${bold(pkgRef.name)} to the registry:`));
      toDeploy.forEach((deploy) => {
        deploy.versions.forEach((tag) => {
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

    console.log('\n------\n');
  }


  if(includeProvisioned) {
    for(const pkg in dedupedPackages!) {
      for(const name in dedupedPackages[pkg].packagesNames) {
        console.log(`${dedupedPackages[pkg].packagesNames[name]}`)
        const newReceipts = await publishPackage({
          packageRef: `${dedupedPackages[pkg].packagesNames[name]}`,
          variant: dedupedPackages[pkg].variant,
          fromStorage,
          toStorage,
          tags,
          includeProvisioned,
        });
    
        registrationReceipts.push(...newReceipts);
      }
    }
  } else {
    for (const deploy of toDeploy) {
      for (const version of deploy.versions) {
        console.log(`${deploy.name}:${version}`)
        const newReceipts = await publishPackage({
          packageRef: `${deploy.name}:${version}`,
          variant: deploy.variant,
          fromStorage,
          toStorage,
          tags,
          includeProvisioned,
        });
    
        registrationReceipts.push(...newReceipts);
      }
    }
  }

  console.log(bold(blueBright('Packages published:')));
  if (includeProvisioned) {
      dedupedPackages!.forEach((pkg) => {
        pkg.packagesNames.forEach((pkgName) => {
          const { basePackageRef } = new PackageReference(pkgName);
          const preset = pkg.variant.substring(pkg.variant.indexOf('-')+1);
          console.log(`- ${basePackageRef} (preset: ${preset})`);
        });
      });
    } else {
      toDeploy.forEach((deploy) => {
        const pkgRef = new PackageReference(deploy.name);
        for (const version of deploy.versions) console.log(`  - ${pkgRef.name}:${version}`);
      });
    }

  const txs = registrationReceipts.filter((tx) => !!tx);
  if (txs.length) {
    console.log(blueBright('Transactions:'));
    for (const tx of txs) console.log(`  - ${tx}`);
  }
}
