import { FC, useEffect, useMemo, useState } from 'react';
import { GetPackagesQuery } from '@/types/graphql/graphql';
import axios from 'axios';
import pako from 'pako';
import { Box, Spinner } from '@chakra-ui/react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-toml';
import 'prismjs/themes/prism.css';

export const Cannonfile: FC<{
  p: GetPackagesQuery['packages'][0];
}> = ({ p }) => {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<any>({});

  const latestVariant = useMemo(() => {
    return p?.tags
      ?.find((t) => t?.name === 'latest')
      ?.variants.find((v) => v.preset === 'main');
  }, [p]);
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

  const highlighter = (code: string) => {
    return highlight(code, languages.toml, 'toml');
  };

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
          <Editor
            highlight={highlighter}
            value={metadata?.cannonfile}
            disabled={true}
            onValueChange={() => {
              // nothing
            }}
          />
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
