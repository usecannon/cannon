import { FC } from 'react';
import axios from 'axios';
import pako from 'pako';
import 'prismjs';
import 'prismjs/components/prism-toml';
import {
  Badge,
  Box,
  Container,
  Heading,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from '@chakra-ui/react';
import { CodePreview } from '@/components/CodePreview';
import { useQuery } from '@tanstack/react-query';
import { IpfsUrl } from './IpfsUrl';
import { CustomSpinner } from '@/components/CustomSpinner';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { format } from 'date-fns';

export const DeploymentExplorer: FC<{
  variant: any;
}> = ({ variant }) => {
  const deploymentData = useQuery({
    queryKey: [variant?.deploy_url],
    queryFn: async ({ signal }) => {
      if (typeof variant?.deploy_url !== 'string') {
        throw new Error(`Invalid deploy url: ${variant?.deploy_url}`);
      }
      const cid = variant?.deploy_url.replace('ipfs://', '');
      const res = await axios.get(`https://ipfs.io/ipfs/${cid}`, {
        responseType: 'arraybuffer',
        signal,
      });
      const data = pako.inflate(res.data, { to: 'string' });
      return JSON.parse(data);
    },
  });

  const deploymentInfo = deploymentData.data
    ? (deploymentData.data as DeploymentInfo)
    : undefined;

  interface Setting {
    defaultValue?: any;
    option?: any;
  }

  const settings: Record<string, Setting> = Object.keys(
    deploymentInfo?.def?.setting || {}
  ).reduce<Record<string, Setting>>((acc, key) => {
    acc[key] = {
      defaultValue: deploymentInfo?.def?.setting?.[key]?.defaultValue,
      option: deploymentInfo?.options?.[key],
    };
    return acc;
  }, deploymentInfo?.options || {});

  return variant?.deploy_url ? (
    <Box>
      {deploymentData.isLoading ? (
        <Box py="20" textAlign="center">
          <CustomSpinner mx="auto" />
        </Box>
      ) : deploymentInfo ? (
        <Container maxW="container.lg">
          {deploymentInfo?.def?.description && (
            <Text fontSize="2xl" mb={1}>
              {deploymentInfo.def.description}
            </Text>
          )}
          <Text color="gray.300" fontSize="xs" fontFamily="mono" mb={2}>
            {deploymentInfo?.generator &&
              `built with ${deploymentInfo.generator} `}
            {deploymentInfo?.generator && deploymentInfo?.timestamp && 'on '}
            {format(
              new Date(deploymentInfo?.timestamp * 1000),
              'PPPppp'
            ).toLowerCase()}
          </Text>
          <Box mb={8}>
            <Badge
              opacity={deploymentInfo?.status == 'complete' ? 0.8 : 0.4}
              colorScheme="green"
            >
              Complete
            </Badge>
            <Tooltip label="A partial deployment occurs when Cannon can't build all of the steps in the chain definition. Cannon can rebuild or the package can be built by a different signer, or a safe">
              <Badge
                ml={3}
                opacity={deploymentInfo?.status == 'partial' ? 0.8 : 0.4}
                colorScheme="yellow"
              >
                partial
              </Badge>
            </Tooltip>
          </Box>
          <Heading size="md" mb={2}>
            Chain Definition
          </Heading>
          <Text>This describes what the chain wants to be</Text>
          package.json here?
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th color="#ffffff">Setting</Th>
                  <Th color="#ffffff">Default Value</Th>
                  <Th color="#ffffff">Option</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(settings).map(([key, value]) => (
                  <Tr key={key}>
                    <Td>{key?.toString()}</Td>
                    <Td>{value.defaultValue?.toString()}</Td>
                    <Td>{JSON.stringify(value)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          X Target Steps / X Invoke Steps (List of tags that open the json in a
          modal)
          <Heading size="md" mb={2}>
            Chain State
          </Heading>
          <Text>
            This describes what the chain is, after building it according to the
            cannonfiles
          </Text>
          <Box>Chain state</Box>
          <Box>Download address + abi</Box>
          <Heading size="md" mb={2}>
            Raw Deployment Data
          </Heading>
          {variant?.deploy_url && (
            <IpfsUrl title="Deployment Data " url={variant.deploy_url} />
          )}
          <CodePreview
            code={JSON.stringify(deploymentInfo, null, 2)}
            language="json"
          />
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
