import 'prismjs';
import 'prismjs/components/prism-toml';

import React, { FC, useState } from 'react';
import { Box, Flex, Heading, Link, Text, Tooltip } from '@chakra-ui/react';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { CustomSpinner } from '@/components/CustomSpinner';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { InfoIcon } from '@chakra-ui/icons';
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
  const [searchTerm, setSearchTerm] = useState<string>('');
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
            obj[key].deployedOn.includes('router') ||
            obj[key].deployedOn.includes('invoke') ||
            obj[key].deployedOn.includes('provision') ||
            obj[key].deployedOn.includes('clone') ||
            obj[key].deployedOn.includes('import') ||
            obj[key].deployedOn.includes('pull') ||
            obj[key].deployedOn.includes('run')
          ) {
            mergedContracts[
              obj[key].contractName || '⚠ Unknown Contract Name'
            ] = obj[key];
          }
        }

        if (obj[key].artifacts && obj[key].artifacts.imports) {
          for (const k in obj[key].artifacts.imports[key.split('.')[1]]
            .contracts) {
            if (
              key.includes('provision') ||
              key.includes('clone') ||
              key.includes('import') ||
              key.includes('pull')
            ) {
              obj[key].artifacts.imports[key.split('.')[1]].contracts[
                k
              ].deployedOn = key;

              // Change deployedOn title to parent package
              mergedContracts[
                obj[key].contractName || '⚠ Unknown Contract Name'
              ] = obj[key].artifacts.imports[key.split('.')[1]].contracts[k];
            }
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

  // Filter and sort based on search term
  const contractEntries = Object.entries(contractState);
  const sortedEntries = contractEntries
    .filter(([key, user]) =>
      Object.values(user).some(value =>
        typeof value === 'string' && value.includes(searchTerm)
      )
    )
    .sort(([keyA, userA], [keyB, userB]) => {
      // Calculate match scores based on search term position
      const scoreA = Math.min(
        ...Object.values(userA).filter(v => typeof v === 'string').map(v => (v as string).indexOf(searchTerm))
      );
      const scoreB = Math.min(
        ...Object.values(userB).filter(v => typeof v === 'string').map(v => (v as string).indexOf(searchTerm))
      );
      return scoreA - scoreB;
    });

  const filteredContractState = Object.fromEntries(sortedEntries);

  console.log(filteredContractState)

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
          <Flex p={6} mb={1} justifyContent={'space-between'} direction={['column', 'column', 'row']}>
            <Heading size="md">Contract Deployments</Heading>
            <Box>
              <SearchInput onSearchChange={setSearchTerm}></SearchInput>
            </Box>
          </Flex>
          {(!isEmpty(filteredContractState)) && !isEmpty(addressesAbis) ? (
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
              <Flex px={4} mb={3} justifyContent={'center'} direction={['column', 'column', 'row']}>
                <Heading size='sm'> No Contracts Found</Heading>
              </Flex>
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
      )
      }
    </Box >
  ) : (
    <Box textAlign="center" py="20" opacity="0.5">
      No metadata is associated with this package
    </Box>
  );
};
