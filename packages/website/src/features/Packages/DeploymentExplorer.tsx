import { FC } from 'react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
  Link,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { CodePreview } from '@/components/CodePreview';
import { IpfsUrl } from './IpfsUrl';
import { CustomSpinner } from '@/components/CustomSpinner';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { format } from 'date-fns';
import { InfoIcon, ViewIcon, DownloadIcon } from '@chakra-ui/icons';
import ChainDefinitionSteps from './ChainDefinitionSteps';
import { ChainBuilderContext } from '@usecannon/builder';
import { isEmpty } from 'lodash';
import { useQueryIpfsData } from '@/hooks/ipfs';

export const DeploymentExplorer: FC<{
  variant: any;
}> = ({ variant }) => {
  const deploymentData = useQueryIpfsData(
    variant?.deploy_url,
    !!variant?.deploy_url
  );

  const deploymentInfo = deploymentData.data
    ? (deploymentData.data as DeploymentInfo)
    : undefined;

  const {
    isOpen: isDeploymentDataModalOpen,
    onOpen: openDeploymentDataModal,
    onClose: closeDeploymentDataModal,
  } = useDisclosure();

  const {
    isOpen: isPackageJsonModalOpen,
    onOpen: openPackageJsonModal,
    onClose: closePackageJsonModal,
  } = useDisclosure();

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
      if (key.startsWith('contract.')) {
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
            Taking a while?{' '}
            <Link href={links.SETTINGS} as={NextLink}>
              Try another IPFS gateway
            </Link>
          </Text>
        </Box>
      ) : deploymentInfo ? (
        <Container maxW="container.lg">
          {deploymentInfo?.def?.description && (
            <Text fontSize="xl" mb={1}>
              {deploymentInfo.def.description}
            </Text>
          )}
          <Text color="gray.300" fontSize="xs" fontFamily="mono" mb={2}>
            {deploymentInfo?.generator &&
              `built with ${deploymentInfo.generator} `}
            {deploymentInfo?.generator &&
              deploymentInfo?.timestamp &&
              `on ${format(
                new Date(deploymentInfo?.timestamp * 1000),
                'PPPppp'
              ).toLowerCase()}`}
          </Text>
          <Box mb={8}>
            {deploymentInfo?.status == 'complete' && (
              <Tooltip label="A complete deployment occurs when the resulting chain state matches the desired chain definition.">
                <Badge opacity={0.8} colorScheme="green">
                  Complete
                </Badge>
              </Tooltip>
            )}
            {deploymentInfo?.status == 'partial' && (
              <Tooltip label="A partial deployment occurs when the resulting chain state did not match the desired chain definition.">
                <Badge ml={3} opacity={0.8} colorScheme="yellow">
                  Partial
                </Badge>
              </Tooltip>
            )}
          </Box>
          <Box mb={6}>
            <Box mb={3}>
              <Heading size="md" mb={1}>
                Chain Definition{' '}
                <Tooltip
                  label="The chain definition describes the desired state of the blockchain based on a Cannonfile."
                  placement="right"
                  hasArrow
                >
                  <InfoIcon color="gray.400" boxSize={4} mt={-1} ml={1} />
                </Tooltip>
              </Heading>
              {!isEmpty(deploymentInfo?.meta) && (
                <>
                  <Box>
                    <Link
                      isExternal
                      styleConfig={{ 'text-decoration': 'none' }}
                      borderBottom="1px dotted"
                      borderBottomColor="gray.300"
                      onClick={openPackageJsonModal}
                      color="gray.300"
                      fontSize="xs"
                      fontFamily="mono"
                    >
                      View package.json Data
                    </Link>
                  </Box>
                  <Modal
                    isOpen={isPackageJsonModalOpen}
                    onClose={closePackageJsonModal}
                    size="6xl"
                  >
                    <ModalOverlay />
                    <ModalContent>
                      <ModalCloseButton />
                      <CodePreview
                        code={JSON.stringify(deploymentInfo?.meta, null, 2)}
                        language="json"
                      />
                    </ModalContent>
                  </Modal>
                </>
              )}
            </Box>
            <Box overflowX="auto" mb={6}>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th color="gray.300" pl={0} borderColor="gray.500">
                      Setting
                    </Th>
                    <Th color="gray.300" borderColor="gray.500">
                      Value
                    </Th>
                  </Tr>
                </Thead>
                <Tbody fontFamily={'mono'}>
                  {Object.entries(settings).map(([key, value]) => (
                    <Tr key={key}>
                      <Td pl={0} borderColor="gray.500">
                        <Tooltip label={value.description}>
                          {key?.toString()}
                        </Tooltip>
                      </Td>
                      <Td borderColor="gray.500">
                        {value.option ? (
                          <>
                            {value.option}{' '}
                            <Text
                              color="gray.500"
                              textDecoration="line-through"
                              display="inline"
                            >
                              {value.defaultValue}
                            </Text>
                          </>
                        ) : (
                          <>{value.defaultValue}</>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
            {deploymentInfo?.def?.import && (
              <Box mb={4}>
                <Heading size="sm" mb={3}>
                  Package Data Imports
                </Heading>
                <ChainDefinitionSteps
                  name="import"
                  modules={deploymentInfo.def.import}
                />
              </Box>
            )}
            {deploymentInfo?.def?.provision && (
              <Box mb={4}>
                <Heading size="sm" mb={3}>
                  Package Provisioning
                </Heading>
                <ChainDefinitionSteps
                  name="provision"
                  modules={deploymentInfo.def.provision}
                />
              </Box>
            )}
            {deploymentInfo?.def?.router && (
              <Box mb={4}>
                <Heading size="sm" mb={3}>
                  Router Generation
                </Heading>
                <ChainDefinitionSteps
                  name="router"
                  modules={deploymentInfo.def.router}
                />
              </Box>
            )}
            {deploymentInfo?.def?.contract && (
              <Box mb={4}>
                <Heading size="sm" mb={3}>
                  Contract Deployments
                </Heading>
                <ChainDefinitionSteps
                  name="contract"
                  modules={deploymentInfo.def.contract}
                />
              </Box>
            )}
            {deploymentInfo?.def?.invoke && (
              <Box mb={4}>
                <Heading size="sm" mb={3}>
                  Function Calls
                </Heading>
                <ChainDefinitionSteps
                  name="invoke"
                  modules={deploymentInfo.def.invoke}
                />
              </Box>
            )}
          </Box>
          <Box mb={6}>
            <Heading size="md" mb={3}>
              Chain State{' '}
              <Tooltip
                label="The chain state describes the state of blockchain resulting from the build."
                placement="right"
                hasArrow
              >
                <InfoIcon color="gray.400" boxSize={4} mt={-1} ml={1} />
              </Tooltip>
            </Heading>
            <Box mb={4}>
              {!isEmpty(contractState) && (
                <>
                  <Heading size="sm" mb={2}>
                    Contract Deployments
                  </Heading>
                  {Object.entries(contractState).length > 0 && (
                    <Box overflowX="auto" mb={4}>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th color="gray.300" pl={0} borderColor="gray.500">
                              Contract
                            </Th>
                            <Th color="gray.300" borderColor="gray.500">
                              Address
                            </Th>
                            <Th color="gray.300" borderColor="gray.500">
                              Transaction Hash
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody fontFamily={'mono'}>
                          {Object.entries(contractState).map(([key, value]) => (
                            <Tr key={key}>
                              <Td pl={0} borderColor="gray.500">
                                {key?.toString()}
                              </Td>
                              <Td borderColor="gray.500">{value.address}</Td>
                              <Td borderColor="gray.500">
                                {value.deployTxnHash}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  )}
                </>
              )}
              <Button
                variant="outline"
                colorScheme="white"
                mb={2}
                size="xs"
                color="gray.300"
                borderColor="gray.500"
                _hover={{ bg: 'gray.700' }}
                leftIcon={<DownloadIcon />}
                onClick={handleDownload}
              >
                Download Addresses + ABIs
              </Button>
            </Box>
            {!isEmpty(invokeState) && (
              <Box mb={4}>
                <Heading size="sm" mb={2}>
                  Function Calls
                </Heading>
                <Box overflowX="auto" mb={6}>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th color="gray.300" pl={0} borderColor="gray.500">
                          Function
                        </Th>
                        <Th color="gray.300" borderColor="gray.500">
                          Transaction Hash
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody fontFamily={'mono'}>
                      {Object.entries(invokeState).map(([key, value]) => (
                        <Tr key={key}>
                          <Td pl={0} borderColor="gray.500">
                            {key?.toString()}
                          </Td>
                          <Td borderColor="gray.500">{value.hash}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            )}
            {!isEmpty(mergedExtras) && (
              <Box mb={4}>
                <Heading size="sm" mb={2}>
                  Stored Event Data{' '}
                  <Tooltip
                    label="This includes event data captured during the build, to be referenced in dependent steps."
                    placement="right"
                    hasArrow
                  >
                    <InfoIcon
                      color="gray.400"
                      boxSize={3.5}
                      mt={-0.5}
                      ml={0.5}
                    />
                  </Tooltip>
                </Heading>
                <Box overflowX="auto" mb={6}>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th color="gray.300" pl={0} borderColor="gray.500">
                          Name
                        </Th>
                        <Th color="gray.300" borderColor="gray.500">
                          Value
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody fontFamily={'mono'}>
                      {Object.entries(mergedExtras).map(([key, value]) => (
                        <Tr key={key}>
                          <Td pl={0} borderColor="gray.500">
                            {key?.toString()}
                          </Td>
                          <Td borderColor="gray.500">{value.toString()}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            )}
          </Box>
          <Box mb={6}>
            <Heading size="md" mb={4}>
              Deployment Data{' '}
              <Tooltip
                label="This is the source of the data displayed above."
                placement="right"
                hasArrow
              >
                <InfoIcon color="gray.400" boxSize={4} mt={-1} ml={1} />
              </Tooltip>
            </Heading>
            <Button
              variant="outline"
              colorScheme="white"
              onClick={openDeploymentDataModal}
              mb={3}
              leftIcon={<ViewIcon />}
            >
              View Deployment Data
            </Button>
            {variant?.deploy_url && <IpfsUrl url={variant.deploy_url} />}

            <Modal
              isOpen={isDeploymentDataModalOpen}
              onClose={closeDeploymentDataModal}
              size="6xl"
            >
              <ModalOverlay />
              <ModalContent>
                <ModalCloseButton />
                <CodePreview
                  code={JSON.stringify(deploymentInfo, null, 2)}
                  language="json"
                />
              </ModalContent>
            </Modal>
          </Box>
        </Container>
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
