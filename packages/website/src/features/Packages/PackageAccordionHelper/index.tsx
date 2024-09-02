import { CustomAccordion, CustomAccordionItem } from '@/components/Accordion';
import RunPackageLocally from '@/features/Packages/PackageAccordionHelper/RunPackageLocally';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { ChainDefinition, DeploymentInfo } from '@usecannon/builder';
import RetrieveAddressAbi from '@/features/Packages/PackageAccordionHelper/RetrieveAddressAbi';
import IntegrateWithPackage from '@/features/Packages/PackageAccordionHelper/IntegrateWithPackage';
import { extractAddressesAbis } from '@/features/Packages/utils/extractAddressesAndABIs';
import { Skeleton, Stack, Text } from '@chakra-ui/react';
import { usePackageByRef } from '@/hooks/api/usePackage';

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
    return (
      <Stack>
        <Skeleton height="20px" />
        <Skeleton height="20px" />
        <Skeleton height="20px" />
      </Stack>
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
    <CustomAccordion allowToggle={!isLoading}>
      <CustomAccordionItem
        title="Run Package Locally"
        accordionPanelProps={{ p: 0 }}
      >
        <RunPackageLocally
          name={name}
          chainId={packagesQuery.data.chainId}
          version={packagesQuery.data.version}
          preset={packagesQuery.data.preset}
        />
      </CustomAccordionItem>

      <CustomAccordionItem
        title="Retrieve Addresses + ABIs"
        accordionPanelProps={{ p: 0 }}
      >
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
      </CustomAccordionItem>

      <CustomAccordionItem
        title="Integrate with this package"
        accordionPanelProps={{ p: 0 }}
      >
        {state && deploymentInfo ? (
          <IntegrateWithPackage
            name={name}
            chainId={packagesQuery.data.chainId}
            preset={packagesQuery.data.preset}
            chainDefinition={new ChainDefinition(deploymentInfo.def)}
            deploymentState={state}
            version={packagesQuery.data.version}
          />
        ) : (
          <Text>Error retrieving deployment data</Text>
        )}
      </CustomAccordionItem>
    </CustomAccordion>
  );
}
