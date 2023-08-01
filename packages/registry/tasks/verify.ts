import path from 'node:path';
import fs from 'node:fs/promises';
import { task } from 'hardhat/config';
import { loadCannonfile } from '@usecannon/cli';

task('verify')
  .addOptionalParam('packageVersion', 'Registry version to verify', 'latest')
  .addOptionalParam('chainId', 'Chain ID of the variant to inspect')
  .addOptionalParam('preset', 'Preset of the variant to inspect', 'main')
  .setAction(async ({ chainId, preset, packageVersion }, hre) => {
    const writeDeployments = path.join(hre.config.paths.root, 'deployments');
    const cannonfile = await loadCannonfile(path.join(hre.config.paths.root, 'cannonfile.toml'));

    if (!chainId) {
      chainId = hre.network.config.chainId?.toString();
    }

    await hre.run('cannon:inspect', {
      packageName: `${cannonfile.name}:${packageVersion}`,
      chainId,
      preset,
      writeDeployments
    });

    for (const filename of await fs.readdir(writeDeployments)) {
      if (path.extname(filename) !== '.json') continue;

      const data = await import(path.join(writeDeployments, filename));

      if (!data.contractName || !data.sourceName) continue;

      try {
        await hre.run('verify:verify', {
          contract: `${data.sourceName}:${data.contractName}`,
          address: data.address,
          constructorArguments: data.constructorArgs || []
        });
      } catch (err) {
        if (err instanceof Error && err.message?.includes('Contract source code already verified')) {
          return console.error(err);
        }

        throw err;
      }
    }
  });
