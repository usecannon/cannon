import { FC, useEffect, useMemo, useState } from 'react';
import { GetPackagesQuery } from '@/types/graphql/graphql';
import axios from 'axios';
import pako from 'pako';
import { Box, Spinner } from '@chakra-ui/react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { CodePreview } from '@/components/CodePreview';
import { isEmpty } from 'lodash';

export const DeploymentExplorer: FC<{
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

  return (
    <Box>
      {loading ? (
        <Box py="20" textAlign="center">
          <Spinner />
        </Box>
      ) : !isEmpty(metadata) ? (
        <CodePreview code={JSON.stringify(metadata, null, 2)} language="json" />
      ) : (
        <Box textAlign="center" py="20" opacity="0.5">
          Deployment data unavailable
          {variant?.meta_url && (
            <Box mt={1} fontSize="xs">
              {variant.meta_url}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
