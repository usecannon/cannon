import { FC } from 'react';
import axios from 'axios';
import pako from 'pako';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { Box, Container, Heading, Text } from '@chakra-ui/react';
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

  const settings: { [key: string]: any } = Object.keys(
    deploymentInfo?.def?.setting || {}
  ).reduce(
    (acc, key) => {
      acc[key] =
        deploymentInfo?.options?.[key] ||
        deploymentInfo?.def?.setting?.[key]?.defaultValue;
      return acc;
    },
    { ...deploymentInfo?.options }
  );

  return variant?.deploy_url ? (
    <Box>
      {deploymentData.isLoading ? (
        <Box py="20" textAlign="center">
          <CustomSpinner mx="auto" />
        </Box>
      ) : deploymentInfo ? (
        <Container maxW="container.lg">
          {deploymentInfo?.def?.description && (
            <Text fontSize="md" mb={4}>
              {deploymentInfo.def.description}
            </Text>
          )}
          <Heading size="md" mb={2}>
            Settings
          </Heading>
          {Object.entries(settings as Object).map(([key, valueObj]) => (
            <Text fontSize="sm" key={key} mb={1}>
              <strong>{key}:</strong> {valueObj}
            </Text>
          ))}
          <Text color="gray.300" fontSize="xs" fontFamily="mono">
            {deploymentInfo?.generator &&
              `built with ${deploymentInfo.generator} `}
            {deploymentInfo?.generator && deploymentInfo?.timestamp && 'on '}
            {format(
              new Date(deploymentInfo?.timestamp * 1000),
              'PPPppp'
            ).toLowerCase()}
          </Text>
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
