import { IPFSLoader, OnChainRegistry, CannonStorage, publishPackage } from '@usecannon/builder';
import { blueBright, gray } from 'chalk';
import { ethers } from 'ethers';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { PackageReference, getProvisionedPackages } from '@usecannon/builder/dist/package';

import { bold, yellow, italic } from 'chalk';
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
  preset: string;
  chainId: number;
}

interface SubPackage {
  packagesNames: string[];
  chainId: number;
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
  const { fullPackageRef } = new PackageReference(packageRef);
  // Ensure publish ipfs url is set
  const cliSettings = resolveCliSettings();
  if (!cliSettings.publishIpfsUrl) {
    throw new Error(
      `In order to publish, a publishIpfsUrl setting must be set in your Cannon configuration. Use '${process.argv[0]} setup' to configure.`
    );
  }

  // Handle deprecated preset specification
  if (presetArg) {
    console.warn(yellow(bold('The --preset option will be deprecated soon. Reference presets in the package reference using the format name:version@preset')));
    packageRef = packageRef.split('@')[0] + `@${presetArg}`;
  }

  if (!quiet) {
    console.log(blueBright(`Publishing with ${await signer.getAddress()}`));
    console.log();
  }
  // Generate CannonStorage to publish ipfs remotely and write to the registry
  const onChainRegistry = new OnChainRegistry({
    signerOrProvider: signer,
    address: cliSettings.registryAddress,
    overrides,
  });
  const toStorage = new CannonStorage(onChainRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl),
  });

  // Generate CannonStorage to retrieve the local instance of the package
  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
  const fromStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));

  // if the package reference doesnt contain a version reference we still want to scan deploys without it.
  // This works as a catch all to get any deployment stored locally.
  // However if a version is passed, we use the basePackageRef to extrapolate and remove any potential preset in the reference.
  let deploys;
  if (packageRef.startsWith('@')) {
    deploys = [{ name: packageRef, chainId: 13370 }];
  } else {
    // Check for deployments that are relevant to the provided packageRef
    deploys = await localRegistry.scanDeploys(fullPackageRef, chainId);
  }

  if (!deploys || deploys.length === 0) {
    throw new Error(
      `Could not find any deployments for ${fullPackageRef}. If you have the IPFS hash of the deployment data, use the fetch command. Otherwise, rebuild the package.`
    );
  }

  // Select screen for when a user is looking for all the local deploys
  if (!skipConfirm && deploys.length > 1) {
    const verification = await prompts({
      type: 'autocompleteMultiselect',
      message: 'Select the packages you want to publish:\n',
      name: 'values',
      choices: deploys.map((d) => {
        const { fullPackageRef } = new PackageReference(d.name);

        return {
          title: `${fullPackageRef} (Chain ID: ${d.chainId})`,
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
    const { name, version, preset } = new PackageReference(deploy.name);
    return { name, version, preset, chainId: deploy.chainId };
  });

  // "dedupe" the deploys so that when we iterate we can go over every package deployment by version
  const parentPackages: DeployList[] = deployNames.reduce((result: DeployList[], item) => {
    const matchingDeploys = result.find((i) => i.name === item.name && i.preset === item.preset);

    if (matchingDeploys) {
      matchingDeploys.versions.push(item.version);
    } else {
      result.push({ name: item.name, versions: [item.version], chainId: item.chainId, preset: item.preset });
    }
    return result;
  }, []);

  let subPackages: SubPackage[] = [];
  if (!skipConfirm) {
    if (includeProvisioned) {
      for (const pkg of parentPackages) {
        for (const version of pkg.versions) {
          const provisionedPackages = await getProvisionedPackages(`${pkg.name}:${version}`, pkg.chainId, tags, fromStorage);
          subPackages.push(...provisionedPackages);
        }
      }

      // dedupe and reduce to subPackages
      subPackages = subPackages.reduce<SubPackage[]>((acc, curr) => {
        if (
          !acc.some((item) => item.packagesNames !== curr.packagesNames && item.chainId === curr.chainId) &&
          !curr.packagesNames.some((r) => {
            const { name } = new PackageReference(r);
            parentPackages.some((p) => name === p.name);
          })
        ) {
          acc.push(curr);
        }
        return acc;
      }, []);

      parentPackages.forEach((deploy) => {
        console.log(blueBright(`This will publish ${bold(deploy.name)} to the registry:`));
        deploy.versions.concat(tags).map((version) => {
          console.log(`- ${version} (preset: ${deploy.preset})`);
        });
      });
      console.log('\n');

      subPackages!.forEach((pkg: SubPackage, index) => {
        console.log(
          blueBright(
            `This will publish ${bold(pkg.packagesNames[index].split(':')[0])} ${bold(
              italic('(Provisioned)')
            )} to the registry:`
          )
        );
        pkg.packagesNames.forEach((pkgName) => {
          const { version, preset } = new PackageReference(pkgName);
          console.log(`- ${version} (preset: ${preset})`);
        });
      });
      console.log('\n');
    } else {
      parentPackages.forEach((deploy) => {
        console.log(blueBright(`This will publish ${bold(deploy.name)} to the registry:`));
        deploy.versions.concat(tags).forEach((version) => {
          console.log(`- ${version} (preset: ${deploy.preset})`);
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
    const publishTags: string[] = pkg.versions.concat(tags);

    const newReceipts = await publishPackage({
      packageRef: `${pkg.name}:${pkg.versions[0]}`,
      chainId: deploys[0].chainId,
      fromStorage,
      toStorage,
      tags: publishTags!,
      preset: pkg.preset,
      includeProvisioned,
    });

    registrationReceipts.push(...newReceipts);
  }

  if (!quiet) {
    console.log(bold(blueBright('Packages published:')));
    if (includeProvisioned) {
      parentPackages.forEach((deploy) => {
        deploy.versions.concat(tags).forEach((ver) => {
          const { fullPackageRef } = new PackageReference(`${deploy.name}:${ver}@${deploy.preset}`);
          console.log(`- ${fullPackageRef}`);
        });
      });
      subPackages!.forEach((pkg) => {
        pkg.packagesNames.forEach((pkgName) => {
          const { fullPackageRef } = new PackageReference(pkgName);
          console.log(`- ${fullPackageRef}`);
        });
      });
    } else {
      parentPackages.forEach((deploy) => {
        deploy.versions.concat(tags).forEach((ver) => {
          const { fullPackageRef } = new PackageReference(`${deploy.name}:${ver}@${deploy.preset}`);
          console.log(`  - ${fullPackageRef}`);
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
