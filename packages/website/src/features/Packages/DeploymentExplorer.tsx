import { FC } from 'react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import {
  Box,
  Button,
  Container,
  Flex,
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
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { CommandPreview } from '@/components/CommandPreview';
import { ContractsTable } from './ContractsTable';
import { InvokesTable } from './InvokesTable';
import { EventsTable } from './EventsTable';

export const DeploymentExplorer: FC<{
  pkg: any;
}> = ({ pkg }) => {
  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    pkg?.deployUrl,
    !!pkg?.deployUrl
  );
  const deploymentInfo = deploymentData.data;

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

  function mergeArtifactsContracts(obj: any, mergedContracts: any = {}): any {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        // If the current object has both address and abi keys
        if (obj[key].address && obj[key].abi) {
          if (
            obj[key].deployedOn.startsWith('deploy') ||
            obj[key].deployedOn.startsWith('contract') ||
            obj[key].deployedOn.includes('router')
          ) {
            mergedContracts[obj[key].contractName] = obj[key];
          }
        }
        // Recursively search through nested objects
        mergeArtifactsContracts(obj[key], mergedContracts);
      }
    }
    return mergedContracts;
  }

  const contractState: ChainBuilderContext['contracts'] = deploymentInfo?.state
    ? mergeArtifactsContracts(deploymentInfo.state)
    : {};

  function mergeInvoke(obj: any, mergedInvokes: any = {}): any {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        // If the current object has both address and abi keys
        if (key === 'txns') {
          for (const key2 in obj[key]) {
            mergedInvokes[obj[key][key2].deployedOn] = obj[key][key2];
          }
        }
        // Recursively search through nested objects
        mergeInvoke(obj[key], mergedInvokes);
      }
    }

    return mergedInvokes;
  }

  const invokeState: ChainBuilderContext['txns'] = deploymentInfo?.state
    ? mergeInvoke(deploymentInfo.state)
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

  const addressesAbis = deploymentInfo?.state
    ? extractAddressesAbis(deploymentInfo.state)
    : {};

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

  const pkgDef = deploymentData?.data?.def;

  return pkg?.deployUrl ? (
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
            Fetching {pkg?.deployUrl}
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
          {
            <Container maxW="container.lg" mt={9} mb={12}>
              <Box
                p={6}
                bg="gray.800"
                border="1px solid"
                borderColor="gray.700"
                borderRadius="sm"
              >
                <Box mb={4}>
                  <Heading size="md" mb={2}>
                    Run Package
                  </Heading>
                  <Text fontSize="sm" color="gray.300">
                    <Link as={NextLink} href="/learn/cli/">
                      Install the CLI
                    </Link>{' '}
                    and then run a local node for development with this package
                    {pkg.chainId != 13370 && ' on a fork'}:
                  </Text>
                </Box>
                <CommandPreview
                  command={`cannon ${pkg.name}${
                    pkg?.tag !== 'latest' ? `:${pkgDef?.version}` : ''
                  }${pkg.preset !== 'main' ? `@${pkgDef?.preset}` : ''}${
                    pkg.chainId != 13370 ? ' --chain-id ' + pkg.chainId : ''
                  }`}
                />
              </Box>
            </Container>
          }
          {(!isEmpty(addressesAbis) || !isEmpty(contractState)) && (
            <Box mt={6}>
              <Flex px={4} mb={3} direction={['column', 'column', 'row']}>
                <Heading size="md">Contract Deployments</Heading>
                <Box ml={[0, 0, 4]} mt={[2, 2, 0]}>
                  <Button
                    variant="outline"
                    colorScheme="white"
                    size="xs"
                    bg="teal.900"
                    borderColor="teal.500"
                    _hover={{ bg: 'teal.800' }}
                    leftIcon={<DownloadIcon boxSize={2.5} />}
                    onClick={handleDownload}
                    textTransform="uppercase"
                    letterSpacing="1px"
                    pt={0.5}
                    fontFamily="var(--font-miriam)"
                    color="gray.200"
                    fontWeight={500}
                  >
                    Download Addresses + ABIs
                  </Button>
                </Box>
              </Flex>
              <Box maxW="100%" overflowX="auto">
                <ContractsTable
                  contractState={contractState}
                  chainId={pkg.chainId}
                />
              </Box>
            </Box>
          )}

          {!isEmpty(invokeState) && (
            <Box mt={6}>
              <Heading size="md" px={4} mb={3}>
                Function Calls
              </Heading>
              <Box maxW="100%" overflowX="auto">
                <InvokesTable invokeState={invokeState} chainId={pkg.chainId} />
              </Box>
            </Box>
          )}

          {!isEmpty(mergedExtras) && (
            <Box mt={6}>
              <Heading size="md" px={4} mb={3}>
                Event Data{' '}
                <Tooltip
                  label="This includes event data captured during the build, to be referenced in dependent operations."
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
