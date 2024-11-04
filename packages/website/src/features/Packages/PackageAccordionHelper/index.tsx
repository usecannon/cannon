import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import RunPackageLocally from '@/features/Packages/PackageAccordionHelper/RunPackageLocally';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { ChainDefinition, DeploymentInfo } from '@usecannon/builder';
import RetrieveAddressAbi from '@/features/Packages/PackageAccordionHelper/RetrieveAddressAbi';
import IntegrateWithPackage from '@/features/Packages/PackageAccordionHelper/IntegrateWithPackage';
import { extractAddressesAbis } from '@/features/Packages/utils/extractAddressesAndABIs';
import { usePackageByRef } from '@/hooks/api/usePackage';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import { useState, useEffect } from 'react';
import { getChainDefinitionFromWorker } from '@/helpers/chain-definition';

type Props = {
  name: string;
  chainId: number;
  tag: string;
  preset: string;
};

export default function PackageAccordionHelper({
  name,
  tag,
  preset,
  chainId,
}: Props) {
  const [chainDefinition, setChainDefinition] =
    useState<ChainDefinition | null>(null);

  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.deployUrl,
    !!packagesQuery?.data?.deployUrl
  );

  const isLoading = packagesQuery.isLoading || deploymentData.isLoading;

  useEffect(() => {
    async function loadChainDefinition() {
      if (deploymentData.data?.def) {
        /** Removing any potential run steps from the definition so it doesnt get registered in ChainDefinition */
        //eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ['run']: _, ...filteredDefinition } = deploymentData.data
          .def as any;

        const chainDefinition = await getChainDefinitionFromWorker(
          filteredDefinition
        );

        setChainDefinition(chainDefinition);
      }
    }

    void loadChainDefinition();
  }, [deploymentData.data?.def]);

  if (isLoading) {
    return (
      <div className="py-20">
        <IpfsSpinner ipfsUrl={packagesQuery?.data?.deployUrl} />
      </div>
    );
  }

  if (!packagesQuery.data || !deploymentData.data) {
    throw new Error('Failed to fetch package');
  }

  const state = deploymentData.data.state;
  const deploymentInfo = deploymentData.data;

  if (!state || !deploymentInfo) {
    return null;
  }

  return (
    <div className="max-w-screen-lg mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Run Package Locally</CardTitle>
            <CardDescription>
              Run this package on a local {chainId == 13370 ? 'node' : 'fork'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RunPackageLocally
              name={name}
              chainId={packagesQuery.data.chainId}
              version={packagesQuery.data.version}
              preset={packagesQuery.data.preset}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retrieve Addresses + ABIs</CardTitle>
            <CardDescription>
              Download the deployment data as a JSON file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetrieveAddressAbi
              name={name}
              chainId={packagesQuery.data.chainId}
              version={packagesQuery.data.version}
              preset={packagesQuery.data.preset}
              addressesAbis={
                deploymentData.data?.state
                  ? extractAddressesAbis(deploymentData.data.state)
                  : {}
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrate with this package</CardTitle>
          <CardDescription>
            Use this package in your cannonfile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state && deploymentInfo && chainDefinition ? (
            <IntegrateWithPackage
              name={name}
              chainId={packagesQuery.data.chainId}
              preset={packagesQuery.data.preset}
              chainDefinition={chainDefinition}
              deploymentState={state}
              version={packagesQuery.data.version}
            />
          ) : (
            <p>Error retrieving deployment data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
