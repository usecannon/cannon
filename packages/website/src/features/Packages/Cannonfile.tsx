import { FC, useEffect, useMemo, useState } from 'react';
import { GetPackagesQuery } from '@/types/graphql/graphql';
import axios from 'axios';
import pako from 'pako';
import { Box, Spinner } from '@chakra-ui/react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { CodePreview } from '@/components/CodePreview';

export const Cannonfile: FC<{
  pkg: GetPackagesQuery['packages'][0];
}> = ({ pkg }) => {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<any>({});

  const latestVariant = useMemo(() => {
    return pkg?.tags
      ?.find((t) => t?.name === 'latest')
      ?.variants.find((v) => v.preset === 'main');
  }, [pkg]);
  useEffect(() => {
    setLoading(true);

    const controller = new AbortController();

    axios
      .get(
        `https://ipfs.io/ipfs/${latestVariant?.meta_url?.replace(
          'ipfs://',
          ''
        )}`,
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

    return () => {
      controller.abort();
    };
  }, [latestVariant]);

  let view;
  if (loading) {
    view = (
      <Box py="20" textAlign="center">
        <Spinner />
      </Box>
    );
  } else {
    if (metadata?.cannonfile) {
      view = (
        <Box>
          <CodePreview code={metadata?.cannonfile} language={'toml'} />
        </Box>
      );
    } else {
      view = (
        <Box textAlign="center" py="20" opacity="0.5">
          Cannonfile unavailable
        </Box>
      );
    }
  }
  return <Box>{view}</Box>;
};
