import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { ChainDefinition, DeploymentInfo } from '@usecannon/builder';
import IntegrateWithPackage from '@/features/Packages/PackageAccordionHelper/IntegrateWithPackage';
import { extractAddressesAbis } from '@/features/Packages/utils/extractAddressesAndABIs';
import { usePackageByRef } from '@/hooks/api/usePackage';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import { useState, useEffect } from 'react';
import { getChainDefinitionFromWorker } from '@/helpers/chain-definition';
import { CommandPreview } from '@/components/CommandPreview';
import { DownloadIcon } from '@radix-ui/react-icons';
import { Braces } from 'lucide-react';
import Link from 'next/link';
import { CustomSpinner } from '@/components/CustomSpinner';

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

  const addressesAbis = deploymentData.data?.state
    ? extractAddressesAbis(deploymentData.data.state)
    : {};

  // Build the command strings
  const version = tag !== 'latest' ? `:${tag}` : '';
  const presetSuffix = preset !== 'main' ? `@${preset}` : '';
  const chainIdSuffix = chainId != 13370 ? ` --chain-id ${chainId}` : '';
  const packageRef = `${name}${version}${presetSuffix}${chainIdSuffix}`;

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

  const handleDownload = (addressesAbis: Record<string, unknown>) => {
    const blob = new Blob([JSON.stringify(addressesAbis, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deployments.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-screen-lg mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Run Package Card */}
        <Card>
          <CardHeader>
            <CardTitle>Run this package on your computer</CardTitle>
            <CardDescription>
              Run this package on a local {chainId == 13370 ? 'node' : 'fork'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommandPreview command={`cannon ${packageRef}`} />
          </CardContent>
          <CardFooter>
            <div className="text-sm text-muted-foreground">
              <Link
                href="/learn/cli/"
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <DownloadIcon className="h-4 w-4" />
                Install CLI
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Retrieve Addresses + ABIs Card */}
        <Card>
          <CardHeader>
            <CardTitle>Retrieve addresses and ABIs</CardTitle>
            <CardDescription>
              Download the deployment data as a JSON file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommandPreview
              command={`cannon inspect ${packageRef} --write-deployments ./deployment`}
            />
          </CardContent>
          <CardFooter>
            <div className="text-sm text-muted-foreground">
              <button
                onClick={() => handleDownload(addressesAbis)}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Braces className="h-4 w-4" />
                Download JSON
              </button>
            </div>
          </CardFooter>
        </Card>

        {/* Conditional Interact Card */}
        {chainId != 13370 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                Interact with this protocol on the blockchain
              </CardTitle>
              <CardDescription>
                Execute transactions on this protocol.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommandPreview command={`cannon interact ${packageRef}`} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Integrate Card */}
      <Card>
        <CardHeader>
          <CardTitle>Integrate with this package</CardTitle>
          <CardDescription>
            Use this package in your cannonfile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state && deploymentInfo ? (
            chainDefinition ? (
              <IntegrateWithPackage
                name={name}
                chainId={packagesQuery.data.chainId}
                preset={packagesQuery.data.preset}
                chainDefinition={chainDefinition}
                deploymentState={state}
                version={packagesQuery.data.version}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CustomSpinner />
                <p className="text-sm mt-4 text-muted-foreground">
                  Processing chain definition...
                </p>
              </div>
            )
          ) : (
            <p className="text-red-500">Error retrieving deployment data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
