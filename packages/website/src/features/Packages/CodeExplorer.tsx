import { FC, useEffect, useState } from 'react';
import axios from 'axios';
import pako from 'pako';
import { Box, Container } from '@chakra-ui/react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { CodePreview } from '@/components/CodePreview';
import { isEmpty } from 'lodash';
import { IpfsUrl } from './IpfsUrl';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useQuery } from '@tanstack/react-query';

export const CodeExplorer: FC<{
  variant: any;
}> = ({ variant }) => {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<any>({});

  useEffect(() => {
    setLoading(true);

    const controller = new AbortController();
    if (variant?.meta_url) {
      axios
        .get(
          `https://ipfs.io/ipfs/${variant?.meta_url?.replace('ipfs://', '')}`,
          { responseType: 'arraybuffer', signal: controller.signal }
        )
        .then((response) => {
          const uint8Array = new Uint8Array(response.data);
          const inflated = pako.inflate(uint8Array);
          const raw = new TextDecoder().decode(inflated);
          setMetadata(JSON.parse(raw));
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
    return () => {
      controller.abort();
    };
  }, [variant]);

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

  const miscUrl =
    deploymentData?.data && JSON.parse(deploymentData?.data)?.miscUrl;
  const miscData = useQuery({
    queryKey: [miscUrl],
    queryFn: async ({ signal }) => {
      if (typeof miscUrl !== 'string') {
        throw new Error(`Invalid deploy url: ${miscUrl}`);
      }
      const cid = miscUrl.replace('ipfs://', '');
      const res = await axios.get(`https://ipfs.io/ipfs/${cid}`, {
        responseType: 'arraybuffer',
        signal,
      });
      const data = pako.inflate(res.data, { to: 'string' });
      return JSON.stringify(JSON.parse(data), null, 2);
    },
    enabled: !!miscUrl,
  });

  return (
    <Container maxW="container.lg">
      {variant.meta_url && (
        <Box mb={8}>
          <IpfsUrl title="Metadata" url={variant.meta_url} />
          {loading ? (
            <Box py="20" textAlign="center">
              <CustomSpinner mx="auto" />
            </Box>
          ) : !isEmpty(metadata) ? (
            <CodePreview
              code={JSON.stringify(metadata, null, 2)}
              language="json"
            />
          ) : (
            <Box textAlign="center" py="20" opacity="0.5">
              Unable to retrieve metadata
            </Box>
          )}
        </Box>
      )}

      <IpfsUrl title="Miscellaneous Data" url={miscUrl} />
      {miscData.data && <CodePreview code={miscData.data} language="json" />}
    </Container>
  );
};
