import { FC } from 'react';
import axios from 'axios';
import pako from 'pako';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { Box, Spinner, Container } from '@chakra-ui/react';
import { CodePreview } from '@/components/CodePreview';
import { useQuery } from '@tanstack/react-query';
import { IpfsUrl } from './IpfsUrl';

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
      return JSON.stringify(JSON.parse(data), null, 2);
    },
  });

  return variant?.deploy_url ? (
    <Box>
      {variant?.deploy_url && (
        <IpfsUrl title="Deployment Data " url={variant.deploy_url} />
      )}

      {deploymentData.isLoading ? (
        <Box py="20" textAlign="center">
          <Spinner />
        </Box>
      ) : deploymentData.data ? (
        <Container maxW="container.lg">
          <CodePreview code={deploymentData.data as string} language="json" />
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
