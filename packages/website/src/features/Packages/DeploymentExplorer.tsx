import { FC } from 'react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import {
  Box,
  Button,
  Container,
  Heading,
  Link,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { CustomSpinner } from '@/components/CustomSpinner';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { InfoIcon, DownloadIcon } from '@chakra-ui/icons';
import { ChainBuilderContext } from '@usecannon/builder';
import { isEmpty } from 'lodash';
import { useQueryIpfsData } from '@/hooks/ipfs';
import { CommandPreview } from '@/components/CommandPreview';
import { ContractsTable } from './ContractsTable';
import { InvokesTable } from './InvokesTable';
import { EventsTable } from './EventsTable';

export const DeploymentExplorer: FC<{
  pkgName: string;
  variant: any;
}> = ({ pkgName, variant }) => {
  const deploymentData = useQueryIpfsData(
    variant?.deploy_url,
    !!variant?.deploy_url
  );

  const deploymentInfo = deploymentData.data
    ? (deploymentData.data as DeploymentInfo)
    : undefined;

  const settings: { [key: string]: any } = {};
  if (deploymentInfo?.def?.setting) {
    for (const key in deploymentInfo.def.setting) {
      if (
        deploymentInfo?.options &&
        deploymentInfo.options[key] !== undefined
      ) {
        settings[key] = {
          ...deploymentInfo.def.setting[key],
          option: deploymentInfo.options[key],
        };
      } else {
        settings[key] = { ...deploymentInfo.def.setting[key] };
      }
    }
  }

  function mergeArtifactsContracts(deploymentInfo: any): any {
    const mergedContracts: any = {};

    for (const key of Object.keys(deploymentInfo?.state)) {
      if (key.startsWith('contract.') || key.startsWith('router.')) {
        const artifactsContracts =
          deploymentInfo.state[key].artifacts.contracts;

        for (const contractKey of Object.keys(artifactsContracts)) {
          mergedContracts[contractKey] = artifactsContracts[contractKey];
        }
      }
    }

    return mergedContracts;
  }

  const contractState: ChainBuilderContext['contracts'] = deploymentInfo?.state
    ? mergeArtifactsContracts(deploymentInfo)
    : {};

  function mergeInvoke(deploymentInfo: any): any {
    const mergedInvokes: any = {};

    for (const key of Object.keys(deploymentInfo?.state)) {
      if (key.startsWith('invoke.')) {
        const txns = deploymentInfo.state[key].artifacts.txns;

        for (const contractKey of Object.keys(txns)) {
          mergedInvokes[contractKey] = txns[contractKey];
        }
      }
    }

    return mergedInvokes;
  }

  const invokeState: ChainBuilderContext['txns'] = deploymentInfo?.state
    ? mergeInvoke(deploymentInfo)
    : {};

  function extractAddressesAbis(obj: any, result: any = {}) {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        // If the current object has both address and abi keys
        if (obj[key].address && obj[key].abi) {
          result[key] = {
            address: obj[key].address,
            abi: obj[key].abi,
          };
        }
        // Recursively search through nested objects
        extractAddressesAbis(obj[key], result);
      }
    }
    return result;
  }

  const addressesAbis = extractAddressesAbis(deploymentInfo);

  type NestedObject = { [key: string]: any };
  function mergeExtras(obj: NestedObject): NestedObject {
    const result: NestedObject = {};

    // Base cases
    if (typeof obj !== 'object' || obj === null) {
      return result;
    }

    // Check current object for "extras"
    if (
      Object.prototype.hasOwnProperty.call(obj, 'extras') &&
      typeof obj['extras'] === 'object'
    ) {
      Object.assign(result, obj['extras']);
    }

    // Recursive case
    for (const key in obj) {
      if (typeof obj[key] === 'object' && key !== 'extras') {
        Object.assign(result, mergeExtras(obj[key]));
      }
    }

    return result;
  }

  const mergedExtras = mergeExtras(deploymentInfo?.state || {});

  const handleDownload = () => {
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

  return variant?.deploy_url ? (
    <Box>
      {deploymentData.isLoading ? (
        <Box
          py="20"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
        >
          <CustomSpinner mx="auto" mb="2" />
          <Text fontSize="sm" mb="1" color="gray.400">
            Fetching {variant?.deploy_url}
          </Text>
          <Text color="gray.500" fontSize="xs">
            This could take a minute. You can also{' '}
            <Link href={links.SETTINGS} as={NextLink}>
              try another IPFS gateway
            </Link>
            .
          </Text>
        </Box>
      ) : deploymentInfo ? (
        <Box>
          {variant.chain_id == 13370 && (
            <Container maxW="container.lg" mt={8}>
              <Box
                bg="blackAlpha.600"
                border="1px solid"
                borderColor="gray.900"
                borderRadius="md"
                p={6}
              >
                <Box mb={4}>
                  <Heading size="md" mb={2}>
                    Run Package
                  </Heading>
                  <Text fontSize="sm" color="gray.300">
                    <Link as={NextLink} href="/learn/cli/">
                      Install the CLI
                    </Link>{' '}
                    and then use the following command to run a local node for
                    development with this package:
                  </Text>
                </Box>
                <CommandPreview
                  command={`cannon ${pkgName}${
                    variant?.tag?.name !== 'latest'
                      ? `:${variant?.tag?.name}`
                      : ''
                  }${variant?.preset !== 'main' ? `@${variant?.preset}` : ''}`}
                />
              </Box>
            </Container>
          )}
          {(!isEmpty(addressesAbis) || !isEmpty(contractState)) && (
            <Box mt={8}>
              <Heading size="md" px={4} mb={3}>
                Contract Deployments
                <Button
                  ml={4}
                  variant="outline"
                  colorScheme="white"
                  size="sm"
                  bg="teal.900"
                  borderColor="teal.500"
                  _hover={{ bg: 'teal.800' }}
                  leftIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  textTransform="uppercase"
                  letterSpacing="1px"
                  fontFamily="var(--font-miriam)"
                  color="gray.200"
                  fontWeight={500}
                >
                  Download Addresses + ABIs
                </Button>
              </Heading>

              <Box maxW="100%" overflowX="auto">
                <ContractsTable contractState={contractState} />
              </Box>
            </Box>
          )}

          {!isEmpty(invokeState) && (
            <Box mt={8}>
              <Heading size="md" px={4} mb={3}>
                Function Calls
              </Heading>
              <Box maxW="100%" overflowX="auto">
                <InvokesTable invokeState={invokeState} />
              </Box>
            </Box>
          )}

          {!isEmpty(mergedExtras) && (
            <Box mt={8}>
              <Heading size="md" px={4} mb={3}>
                Event Data{' '}
                <Tooltip
                  label="This includes event data captured during the build, to be referenced in dependent steps."
                  placement="right"
                  hasArrow
                >
                  <InfoIcon color="gray.400" boxSize={3.5} mt={-0.5} ml={0.5} />
                </Tooltip>
              </Heading>
              <Box maxW="100%" overflowX="auto">
                <EventsTable extrasState={mergedExtras} />
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <Box textAlign="center" py="20" opacity="0.5">
          Unable to retrieve deployment data
        </Box>
      )}
    </Box>
  ) : (
    <Box textAlign="center" py="20" opacity="0.5">
      No metadata is associated with this package
    </Box>
  );
};
