import { FC } from 'react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import {
  Badge,
  Box,
  Container,
  Flex,
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
import { format } from 'date-fns';
import { InfoIcon } from '@chakra-ui/icons';
import ChainDefinitionSteps from './ChainDefinitionSteps';
import { isEmpty } from 'lodash';
import { useQueryIpfsData } from '@/hooks/ipfs';
import { CannonfileGraph } from './CannonfileGraph';
import { ViewAsCannonFileButton } from './ViewAsCannonFileButton';
import { StepModalProvider } from '@/providers/stepModalProvider';

export const CannonfileExplorer: FC<{
  pkgName: string;
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
        <Container maxW="container.lg">
          <Flex direction={['column', 'column', 'row']} pb={2}>
            <Box pb={2}>
              {deploymentInfo?.def?.description && (
                <Text fontSize="xl">{deploymentInfo.def.description}</Text>
              )}
              <Text color="gray.300" fontSize="xs" mb={1} letterSpacing="0.2px">
                {deploymentInfo?.generator &&
                  `built with ${deploymentInfo.generator} `}
                {deploymentInfo?.generator &&
                  deploymentInfo?.timestamp &&
                  `on ${format(
                    new Date(deploymentInfo?.timestamp * 1000),
                    'PPPppp'
                  ).toLowerCase()}`}
              </Text>
            </Box>
            <Box ml={['none', 'none', 'auto']} pl={[0, 0, 4]} pt={0.5} pb={4}>
              {deploymentInfo?.status == 'complete' && (
                <Tooltip label="A complete deployment occurs when the resulting chain state matches the desired chain definition.">
                  <Badge opacity={0.8} colorScheme="green">
                    Complete deployment
                  </Badge>
                </Tooltip>
              )}
              {deploymentInfo?.status == 'partial' && (
                <Tooltip label="A partial deployment occurs when the resulting chain state did not match the desired chain definition.">
                  <Badge opacity={0.8} colorScheme="yellow">
                    Partial deployment
                  </Badge>
                </Tooltip>
              )}
            </Box>
          </Flex>
          <Box
            bg="blackAlpha.600"
            border="1px solid"
            borderColor="gray.900"
            borderRadius="md"
            p={6}
            mb={6}
          >
            <StepModalProvider>
              <Box mb={3}>
                <Heading size="md" mb={2}>
                  Chain Definition
                </Heading>
                <Text fontSize="sm" color="gray.300">
                  The chain definition describes the desired state of the
                  blockchain based on a cannonfile.
                </Text>
              </Box>
              <Box mb={3}>
                <CannonfileGraph deploymentInfo={deploymentInfo} />
              </Box>
              <ViewAsCannonFileButton deploymentInfo={deploymentInfo} />
              {Object.entries(settings).length > 0 && (
                <Box mt={4}>
                  <Heading size="sm" mb={2}>
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
              {deploymentInfo?.def?.import && (
                <Box mt={4}>
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
                <Box mt={4}>
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
                <Box mt={4}>
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
                <Box mt={4} maxW="100%" overflowX="auto">
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
                <Box mt={4} maxW="100%" overflowX="auto">
                  <Heading size="sm" mb={3}>
                    Function Calls
                  </Heading>
                  <ChainDefinitionSteps
                    name="invoke"
                    modules={deploymentInfo.def.invoke}
                  />
                </Box>
              )}
            </StepModalProvider>
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
