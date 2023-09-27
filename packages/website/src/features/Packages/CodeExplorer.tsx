import { FC, useEffect, useState } from 'react';
import axios from 'axios';
import pako from 'pako';
import {
  Box,
  Button,
  Flex,
  Heading,
  Tooltip,
  IconButton,
  useBreakpointValue,
} from '@chakra-ui/react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { CodePreview } from '@/components/CodePreview';
import { useQuery } from '@tanstack/react-query';
import { DownloadIcon } from '@chakra-ui/icons';

const handleDownload = (content: JSON, filename: string) => {
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const CodeExplorer: FC<{
  variant: any;
}> = ({ variant }) => {
  const [, setLoading] = useState(false);
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

  let miscUrl: string | undefined;
  if (deploymentData?.data) {
    miscUrl =
      typeof deploymentData?.data === 'string'
        ? JSON.parse(deploymentData?.data)?.miscUrl
        : JSON.parse(JSON.stringify((deploymentData as any)?.data))?.miscUrl;
  }

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

  useEffect(() => {
    if (miscData?.data) {
      const parsedData = JSON.parse(miscData.data);
      const firstArtifact = Object.entries(parsedData.artifacts).sort(
        ([keyA], [keyB]) => {
          const countA = (keyA.match(/:/g) || []).length;
          const countB = (keyB.match(/:/g) || []).length;
          return countA - countB;
        }
      )[0];

      if (firstArtifact) {
        const [, firstArtifactValue] = firstArtifact;
        const sortedSources = Object.entries(
          JSON.parse((firstArtifactValue as any)?.source?.input).sources
        ).sort(([keyA], [keyB]) => {
          const countA = (keyA.match(/\//g) || []).length;
          const countB = (keyB.match(/\//g) || []).length;
          return countA - countB;
        });

        const firstSource = sortedSources[0];

        if (firstSource) {
          const [sourceKey, sourceValue] = firstSource;
          setSelectedCode((sourceValue as any)?.content);
          setSelectedLanguage('solidity');
          setSelectedKey(sourceKey);
        }
      }
    }
  }, [miscData?.data]);

  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  const [selectedCode, setSelectedCode] = useState('');
  const [selectedLangauge, setSelectedLanguage] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  return (
    <Flex flex="1" direction="column" maxHeight="100%" maxWidth="100%">
      <Flex flex="1" direction={['column', 'column', 'row']}>
        <Flex
          flexDirection="column"
          overflowY="auto"
          maxWidth={['100%', '100%', '300px']}
          borderRight={isSmall ? 'none' : '1px solid'}
          borderBottom={isSmall ? '1px solid' : 'none'}
          borderColor={isSmall ? 'gray.600' : 'gray.700'}
          width={['100%', '100%', '300px']}
          maxHeight={['140px', '140px', 'calc(100vh - 236px)']}
        >
          <Box px={3} pb={2}>
            {miscData?.data &&
              Object.entries(JSON.parse(miscData?.data).artifacts).map(
                ([artifactKey, artifactValue]) => {
                  return (
                    <Box key={artifactKey} mt={4}>
                      <Flex
                        flexDirection="row"
                        px="2"
                        alignItems="center"
                        mb="1"
                      >
                        <Heading
                          fontWeight="500"
                          size="sm"
                          color="gray.200"
                          letterSpacing="0.1px"
                          mr="1"
                        >
                          {artifactKey.split(':').length > 1
                            ? artifactKey.split(':')[1]
                            : artifactKey}
                        </Heading>

                        <Button
                          variant="outline"
                          colorScheme="white"
                          size="xs"
                          color="gray.300"
                          borderColor="gray.500"
                          _hover={{ bg: 'gray.700' }}
                          leftIcon={<DownloadIcon />}
                          onClick={() => {
                            handleDownload(
                              (artifactValue as any)?.abi,
                              'deployments.json'
                            );
                          }}
                          ml="auto"
                        >
                          ABI
                        </Button>
                      </Flex>
                      {Object.entries(
                        JSON.parse((artifactValue as any)?.source?.input)
                          .sources
                      )
                        .sort(([keyA], [keyB]) => {
                          const countA = (keyA.match(/\//g) || []).length;
                          const countB = (keyB.match(/\//g) || []).length;
                          return countA - countB; // Sorts in ascending order
                        })
                        .map(([sourceKey, sourceValue]) => {
                          return (
                            <Tooltip
                              label={sourceKey}
                              key={sourceKey}
                              placement="right"
                            >
                              <Box
                                borderRadius="md"
                                mb={0.5}
                                py={0.5}
                                px="2"
                                cursor="pointer"
                                fontSize="sm"
                                _hover={{ background: 'gray.800' }}
                                onClick={() => {
                                  setSelectedCode(
                                    (sourceValue as any)?.content
                                  );
                                  setSelectedLanguage('solidity');
                                  setSelectedKey(sourceKey);
                                }}
                                whiteSpace="nowrap"
                                overflow="hidden"
                                textOverflow="ellipsis"
                                style={{
                                  direction: 'rtl', // Reverses the text display order
                                  unicodeBidi: 'bidi-override', // Overrides the default bidi algorithm
                                }}
                                textAlign="left" // Left-aligns the text
                                fontWeight={
                                  selectedKey == sourceKey
                                    ? 'medium'
                                    : undefined
                                }
                                background={
                                  selectedKey == sourceKey
                                    ? 'gray.800'
                                    : undefined
                                }
                              >
                                {sourceKey.split('').reverse().join('')}
                              </Box>
                            </Tooltip>
                          );
                        })}
                    </Box>
                  );
                }
              )}

            {metadata.cannonfile && (
              <>
                <Box mt={4}>
                  <Flex flexDirection="row" px="2" alignItems="center" mb="1">
                    <Heading
                      fontWeight="500"
                      size="sm"
                      color="gray.200"
                      letterSpacing="0.1px"
                    >
                      Metadata
                    </Heading>

                    <IconButton
                      aria-label="Download Metadata"
                      variant="outline"
                      colorScheme="white"
                      size="xs"
                      color="gray.300"
                      borderColor="gray.500"
                      _hover={{ bg: 'gray.700' }}
                      icon={<DownloadIcon />}
                      onClick={() => {
                        handleDownload(metadata, 'metadata.json');
                      }}
                      ml="auto"
                    ></IconButton>
                  </Flex>
                </Box>

                <Box
                  borderRadius="md"
                  mb={0.5}
                  py={0.5}
                  px="2"
                  cursor="pointer"
                  fontSize="sm"
                  _hover={{ background: 'gray.800' }}
                  onClick={() => {
                    setSelectedCode(metadata.cannonfile);
                    setSelectedLanguage('toml');
                    setSelectedKey('cannonfile');
                  }}
                  fontWeight={
                    selectedKey == 'cannonfile' ? 'medium' : undefined
                  }
                >
                  Cannonfile
                </Box>
              </>
            )}
          </Box>
        </Flex>

        <Box
          flex="1"
          overflowY="auto"
          maxHeight={['none', 'none', 'calc(100vh - 236px)']}
          background="gray.800"
        >
          <CodePreview code={selectedCode} language={selectedLangauge} />
        </Box>
      </Flex>
    </Flex>
  );
};
