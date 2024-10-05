import 'prismjs';
import 'prismjs/components/prism-toml';

import React, { FC, useState } from 'react';
import {
  Box,
  Collapse,
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
import { ChevronDownIcon, InfoIcon } from '@chakra-ui/icons';
import { ChainBuilderContext } from '@usecannon/builder';
import { isEmpty } from 'lodash';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { ContractsTable } from './ContractsTable';
import { InvokesTable } from './InvokesTable';
import { EventsTable } from './EventsTable';
import { extractAddressesAbis } from '@/features/Packages/utils/extractAddressesAndABIs';
import { ApiPackage } from '@usecannon/api/dist/src/types';
import SearchInput from '@/components/SearchInput';

export const DeploymentExplorer: FC<{
  pkg: ApiPackage;
}> = ({ pkg }) => {
  const [contractSearchTerm, setContractSearchTerm] = useState<string>('');
  const [invokeSearchTerm, setInvokeSearchTerm] = useState<string>('');

  const [showInvoke, setShowInvoke] = React.useState(true);
  const [showContracts, setShowContracts] = React.useState(true);

  const handleContractCollapse = () => setShowContracts(!showContracts);
  const handleInvokeCollapse = () => setShowInvoke(!showInvoke);

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

  const stepDefinitions: string[] = [
    'deploy',
    'contract',
    'provision',
    'clone',
    'import',
    'pull',
    'router',
    'invoke',
    'run',
  ];

  function mergeArtifactsContracts(obj: any, mergedContracts: any = {}): any {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        // If the current object has both address and abi keys
        if (obj[key].address && obj[key].abi) {
          if (
            stepDefinitions.some((step) => obj[key].deployedOn.includes(step))
          ) {
            mergedContracts[
              obj[key].contractName || '⚠ Unknown Contract Name'
            ] = obj[key];
          }
        }

        //Adding contracts imported from subpackages
        if (obj[key].artifacts && obj[key].artifacts.imports) {
          const step = key.split('.')[1];
          for (const contract in obj[key].artifacts.imports[step].contracts) {
            obj[key].artifacts.imports[step].contracts[contract].deployedOn =
              key;

            // Change deployedOn title to parent package
            mergedContracts[
              obj[key].contractName || '⚠ Unknown Contract Name'
            ] = obj[key].artifacts.imports[step].contracts[contract];
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

  // Filter and sort based on search term and sort order of steps
  const contractEntries = Object.entries(contractState);
  const filteredContractState = Object.fromEntries(
    contractEntries
      .sort(
        ([, { deployedOn: propA }], [, { deployedOn: propB }]) =>
          stepDefinitions.findIndex((val) => propA.includes(val)) -
          stepDefinitions.findIndex((val) => propB.includes(val))
      )
      .filter(([, val]) =>
        Object.values(val).some(
          (v) =>
            typeof v === 'string' &&
            v.toLowerCase().includes(contractSearchTerm.toLowerCase())
        )
      )
  );

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

  const invokeEntries = Object.entries(invokeState);
  const filteredInvokeState = Object.fromEntries(
    invokeEntries.filter(([, func]) =>
      Object.values(func).some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().includes(invokeSearchTerm.toLowerCase())
      )
    )
  );

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
          <Flex
            p={6}
            mb={1}
            justifyContent={'flex-start'}
            alignItems={'baseline'}
            direction={['column', 'column', 'row']}
          >
            <Heading size="md">
              Contract Deployments
              <ChevronDownIcon
                ml={2}
                onClick={handleContractCollapse}
              ></ChevronDownIcon>
            </Heading>
            <Box pl={6}>
              <SearchInput onSearchChange={setContractSearchTerm}></SearchInput>
            </Box>
          </Flex>
          <Collapse in={showContracts}>
            {!isEmpty(filteredContractState) && !isEmpty(addressesAbis) ? (
              <Box mt={2}>
                <Box maxW="100%" overflowX="auto">
                  <ContractsTable
                    contractState={filteredContractState}
                    chainId={pkg.chainId}
                  />
                </Box>
              </Box>
            ) : (
              <Box mt={6}>
                <Flex
                  px={4}
                  mb={3}
                  justifyContent={'center'}
                  direction={['column', 'column', 'row']}
                >
                  <Heading size="sm"> No Contracts Found</Heading>
                </Flex>
              </Box>
            )}
          </Collapse>
          <Flex
            p={6}
            mt={3}
            justifyContent={'flex-start'}
            alignItems={'baseline'}
            direction={['column', 'column', 'row']}
          >
            <Heading size="md" px={4} mb={3}>
              Function Calls
            </Heading>
            <ChevronDownIcon
              ml={2}
              onClick={handleInvokeCollapse}
            ></ChevronDownIcon>
            <Box pl={6}>
              <SearchInput onSearchChange={setInvokeSearchTerm}></SearchInput>
            </Box>
          </Flex>

          <Collapse in={showInvoke}>
            {!isEmpty(invokeState) ? (
              <Box>
                <Box maxW="100%" overflowX="auto">
                  <InvokesTable
                    invokeState={filteredInvokeState}
                    chainId={pkg.chainId}
                  />
                </Box>
              </Box>
            ) : (
              <Box mt={6}>
                <Flex
                  px={4}
                  mb={3}
                  justifyContent={'center'}
                  direction={['column', 'column', 'row']}
                >
                  <Heading size="sm"> No Functions Found</Heading>
                </Flex>
              </Box>
            )}
          </Collapse>

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
