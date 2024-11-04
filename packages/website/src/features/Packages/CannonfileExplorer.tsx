import { FC, useState } from 'react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import {
  Box,
  Flex,
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
import { CustomSpinner } from '@/components/CustomSpinner';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { InfoIcon } from '@chakra-ui/icons';
import ChainDefinitionSteps from './ChainDefinitionSteps';
import { isEmpty } from 'lodash';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { CannonfileGraph } from './CannonfileGraph';
import { StepModalProvider } from '@/providers/stepModalProvider';
import { stringify } from '@iarna/toml';
import { PiGraphLight, PiCodeLight, PiListBullets } from 'react-icons/pi';
import { ApiPackage } from '@usecannon/api/dist/src/types';

function omitEmptyObjects(config: { [x: string]: any }) {
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      const value = config[key];
      if (
        value &&
        typeof value === 'object' &&
        Object.keys(value).length === 0
      ) {
        delete config[key];
      } else if (typeof value === 'object') {
        omitEmptyObjects(value);
      }
    }
  }
  return config;
}

export const CannonfileExplorer: FC<{
  pkg: ApiPackage;
}> = ({ pkg }) => {
  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    pkg?.deployUrl,
    !!pkg?.deployUrl
  );
  const deploymentInfo = deploymentData.data;

  const {
    isOpen: isPackageJsonModalOpen,
    onOpen: openPackageJsonModal,
    onClose: closePackageJsonModal,
  } = useDisclosure();

  const [displayMode, setDisplayMode] = useState(1);

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

  // Deep clone the deploymentInfo.def object
  const clonedDeploymentInfoDef = deploymentInfo?.def
    ? JSON.parse(JSON.stringify(deploymentInfo.def))
    : null;

  // Apply the omitEmptyObjects function to the cloned object
  const processedDeploymentInfo = clonedDeploymentInfoDef
    ? omitEmptyObjects(clonedDeploymentInfoDef)
    : null;

  const pulls = {
    ...(deploymentInfo?.def?.import || {}),
    ...(deploymentInfo?.def?.pull || {}),
  };

  const clones = {
    ...(deploymentInfo?.def?.provision || {}),
    ...(deploymentInfo?.def?.clone || {}),
  };

  const deploys = {
    ...(deploymentInfo?.def?.contract || {}),
    ...(deploymentInfo?.def?.deploy || {}),
  };

  return pkg?.deployUrl ? (
    <Flex flex="1" direction="column">
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
        <Flex position="relative" flex="1" direction="column" minHeight="420px">
          <Flex
            position="absolute"
            borderRadius="full"
            border="1px solid"
            top="16px"
            left="50%"
            transform="translateX(-50%)"
            overflow="hidden"
            borderColor="gray.500"
            background="black"
            align="center"
            zIndex={100}
          >
            <Link
              onClick={() => setDisplayMode(1)}
              p={3}
              pl={4}
              display="inline-block"
              _hover={{ bg: 'gray.900' }}
            >
              <PiGraphLight
                size="24"
                fill={displayMode == 1 ? '#1ad6ff' : 'white'}
              />
            </Link>
            <Link
              onClick={() => setDisplayMode(2)}
              p={3}
              display="inline-block"
              borderLeft="1px solid"
              borderRight="1px solid"
              borderColor="gray.500"
              _hover={{ bg: 'gray.900' }}
            >
              <PiListBullets
                size="24"
                fill={displayMode == 2 ? '#1ad6ff' : 'white'}
              />
            </Link>
            <Link
              onClick={() => setDisplayMode(3)}
              p={3}
              pr={4}
              display="inline-block"
              _hover={{ bg: 'gray.900' }}
            >
              <PiCodeLight
                size="24"
                fill={displayMode == 3 ? '#1ad6ff' : 'white'}
              />
            </Link>
          </Flex>

          <StepModalProvider>
            <Flex
              display={displayMode == 1 ? 'block' : 'none'}
              flex="1"
              direction="column"
            >
              <CannonfileGraph deploymentDefinition={deploymentInfo.def} />
            </Flex>
            <Container
              maxW="container.lg"
              py={14}
              display={displayMode == 2 ? 'block' : 'none'}
            >
              {Object.entries(settings).length > 0 && (
                <Box mt={4}>
                  <Heading size="md" mb={3}>
                    Settings
                  </Heading>
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

                    {!isEmpty(deploymentInfo?.meta) && (
                      <>
                        <Box mt={1.5}>
                          <Link
                            isExternal
                            styleConfig={{ 'text-decoration': 'none' }}
                            borderBottom="1px dotted"
                            borderBottomColor="gray.300"
                            onClick={openPackageJsonModal}
                            color="gray.300"
                            fontSize="xs"
                            fontFamily="mono"
                            cursor={'pointer'}
                          >
                            package.json
                          </Link>{' '}
                          <Tooltip
                            label="Cannon includes a project's package.json in the Cannonfile context."
                            placement="right"
                            hasArrow
                          >
                            <InfoIcon color="gray.400" boxSize={3} ml={0.5} />
                          </Tooltip>
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
                              code={JSON.stringify(
                                deploymentInfo?.meta,
                                null,
                                2
                              )}
                              language="json"
                            />
                          </ModalContent>
                        </Modal>
                      </>
                    )}
                  </Box>
                </Box>
              )}
              {deploymentInfo?.def?.var && (
                <Box mt={4}>
                  <Heading size="md" mb={3}>
                    Variable Setting
                  </Heading>
                  <ChainDefinitionSteps
                    name="var"
                    modules={deploymentInfo?.def?.var}
                  />
                </Box>
              )}
              {!isEmpty(pulls) && (
                <Box mt={4}>
                  <Heading size="md" mb={3}>
                    Pulled Packages
                  </Heading>
                  <ChainDefinitionSteps name="pull" modules={pulls} />
                </Box>
              )}
              {!isEmpty(clones) && (
                <Box mt={4}>
                  <Heading size="md" mb={3}>
                    Cloned Package
                  </Heading>
                  <ChainDefinitionSteps name="clone" modules={clones} />
                </Box>
              )}
              {deploymentInfo?.def?.router && (
                <Box mt={4}>
                  <Heading size="md" mb={3}>
                    Router Generation
                  </Heading>
                  <ChainDefinitionSteps
                    name="router"
                    modules={deploymentInfo.def.router}
                  />
                </Box>
              )}
              {!isEmpty(deploys) && (
                <Box mt={4} maxW="100%" overflowX="auto">
                  <Heading size="md" mb={3}>
                    Contract Deployments
                  </Heading>
                  <ChainDefinitionSteps name="deploy" modules={deploys} />
                </Box>
              )}
              {deploymentInfo?.def?.invoke && (
                <Box mt={4} maxW="100%" overflowX="auto">
                  <Heading size="md" mb={3}>
                    Function Calls
                  </Heading>
                  <ChainDefinitionSteps
                    name="invoke"
                    modules={deploymentInfo.def.invoke}
                  />
                </Box>
              )}
            </Container>

            <Flex
              display={displayMode == 3 ? 'block' : 'none'}
              flex="1"
              direction="column"
            >
              <CodePreview
                code={stringify(processedDeploymentInfo as any)}
                language="ini"
                height="100%"
              />
            </Flex>
          </StepModalProvider>
        </Flex>
      ) : (
        <Box textAlign="center" py="20" opacity="0.5">
          Unable to retrieve deployment data
        </Box>
      )}
    </Flex>
  ) : (
    <Box textAlign="center" py="20" opacity="0.5">
      No metadata is associated with this package
    </Box>
  );
};
