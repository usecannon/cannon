import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RunPackageLocally from '@/features/Packages/PackageAccordionHelper/RunPackageLocally';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { ChainDefinition, DeploymentInfo } from '@usecannon/builder';
import RetrieveAddressAbi from '@/features/Packages/PackageAccordionHelper/RetrieveAddressAbi';
import IntegrateWithPackage from '@/features/Packages/PackageAccordionHelper/IntegrateWithPackage';
import { extractAddressesAbis } from '@/features/Packages/utils/extractAddressesAndABIs';
import { usePackageByRef } from '@/hooks/api/usePackage';
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
  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.deployUrl,
    !!packagesQuery?.data?.deployUrl
  );

  const isLoading = packagesQuery.isLoading || deploymentData.isLoading;

  if (isLoading) {
    return <CustomSpinner />;
  }

  if (!packagesQuery.data || !deploymentData.data) {
    throw new Error('Failed to fetch package');
  }

  const state = deploymentData.data.state;
  const deploymentInfo = deploymentData.data;

  if (!state || !deploymentInfo) {
    return null;
  }

  /** Removing any potential run steps from the definition so it doesnt get registered in ChainDefinition */
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ['run']: _, ...filteredDefinition } = deploymentInfo.def as any;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run Package Locally</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Integrate with this package</CardTitle>
        </CardHeader>
        <CardContent>
          {state && deploymentInfo ? (
            <IntegrateWithPackage
              name={name}
              chainId={packagesQuery.data.chainId}
              preset={packagesQuery.data.preset}
              chainDefinition={new ChainDefinition(filteredDefinition)}
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
