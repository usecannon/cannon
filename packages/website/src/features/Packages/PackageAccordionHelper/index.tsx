import { CustomAccordion, CustomAccordionItem } from '@/components/Accordion';
import { useQuery } from '@tanstack/react-query';
import { getPackage } from '@/helpers/api';
import RunPackageLocally from '@/features/Packages/PackageAccordionHelper/RunPackageLocally';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { ChainDefinition, DeploymentInfo } from '@usecannon/builder';
import RetrieveAddressAbi from '@/features/Packages/PackageAccordionHelper/RetrieveAddressAbi';
import IntegrateWithPackage from '@/features/Packages/PackageAccordionHelper/IntegrateWithPackage';
import { extractAddressesAbis } from '@/features/Packages/utils/extractAddressesAndABIs';
import { Skeleton, Stack, Text } from '@chakra-ui/react';

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
  const packagesQuery: any = useQuery({
    queryKey: ['package', [`${name}:${tag}@${preset}/${chainId}`]],
    queryFn: getPackage,
  });

  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.data.deployUrl,
    !!packagesQuery?.data?.data.deployUrl
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

  const state = deploymentData.data?.state;
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
          chainId={packagesQuery.data.data.chainId}
          version={packagesQuery.data.data.version}
          preset={packagesQuery.data.data.preset}
        />
      </CustomAccordionItem>

      <CustomAccordionItem
        title="Retrieve Addresses + ABIs"
        accordionPanelProps={{ p: 0 }}
      >
        <RetrieveAddressAbi
          name={name}
          chainId={packagesQuery.data.data.chainId}
          version={packagesQuery.data.data.version}
          preset={packagesQuery.data.data.preset}
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
            chainId={packagesQuery.data.data.chainId}
            preset={packagesQuery.data.data.preset}
            chainDefinition={new ChainDefinition(deploymentInfo.def)}
            deploymentState={state}
            version={packagesQuery.data.data.version}
          />
        ) : (
          <Text>Error retrieving deployment data</Text>
        )}
      </CustomAccordionItem>
    </CustomAccordion>
  );
}
