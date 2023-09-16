import { FC, useEffect, useState } from 'react';
import axios from 'axios';
import pako from 'pako';
import {
  Box,
  Button,
  Code,
  Container,
  Flex,
  Heading,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { CodePreview } from '@/components/CodePreview';
import { IpfsUrl } from './IpfsUrl';
import { useQuery } from '@tanstack/react-query';
import { DownloadIcon, InfoIcon, ViewIcon } from '@chakra-ui/icons';

const handleDownload = (content: JSON) => {
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'deployments.json';
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

  const {
    isOpen: isCodeDataModalOpen,
    onOpen: openCodeDataModal,
    onClose: closeCodeDataModal,
  } = useDisclosure();

  const {
    isOpen: isMetadataModalOpen,
    onOpen: openMetadataModal,
    onClose: closeMetadataModal,
  } = useDisclosure();

  return (
    <Container maxW="container.lg">
      {miscData?.data &&
        Object.entries(JSON.parse(miscData?.data).artifacts).map(
          ([artifactKey, artifactValue]) => {
            return (
              <Box key={artifactKey} mb={8}>
                <Flex flexDirection={['column', 'column', 'row']} mb="2">
                  <Heading size="md" mb="2">
                    {artifactKey}
                  </Heading>

                  <Button
                    variant="outline"
                    colorScheme="white"
                    mb={2}
                    size="xs"
                    color="gray.300"
                    borderColor="gray.500"
                    _hover={{ bg: 'gray.700' }}
                    leftIcon={<DownloadIcon />}
                    onClick={() => {
                      handleDownload((artifactValue as any)?.abi);
                    }}
                    ml={[0, 0, 'auto']}
                  >
                    Download ABI
                  </Button>
                </Flex>
                {Object.entries(
                  JSON.parse((artifactValue as any)?.source?.input).sources
                ).map(([sourceKey, sourceValue]) => {
                  return (
                    <Box key={sourceKey} mb={6}>
                      <Code fontSize="lg" mb="4">
                        {sourceKey}
                      </Code>
                      <CodePreview
                        code={(sourceValue as any)?.content}
                        language="solidity"
                      />
                    </Box>
                  );
                })}
              </Box>
            );
          }
        )}

      <Box mb={6}>
        <Heading size="md" mb={4}>
          Code Data{' '}
          <Tooltip
            label="This is the source of the data displayed above."
            placement="right"
            hasArrow
          >
            <InfoIcon color="gray.400" boxSize={4} mt={-1} ml={1} />
          </Tooltip>
        </Heading>
        <Button
          variant="outline"
          colorScheme="white"
          onClick={openCodeDataModal}
          mb={3}
          leftIcon={<ViewIcon />}
        >
          View Code Data
        </Button>
        {variant?.deploy_url && <IpfsUrl url={variant.deploy_url} />}

        <Modal
          isOpen={isCodeDataModalOpen}
          onClose={closeCodeDataModal}
          size="6xl"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalCloseButton />
            <CodePreview
              code={JSON.stringify(miscData.data, null, 2)}
              language="json"
            />
          </ModalContent>
        </Modal>
      </Box>

      <Box mb={6}>
        <Heading size="md" mb={4}>
          Metadata{' '}
          <Tooltip
            label="This includes data like the Cannonfile used to build the package."
            placement="right"
            hasArrow
          >
            <InfoIcon color="gray.400" boxSize={4} mt={-1} ml={1} />
          </Tooltip>
        </Heading>
        <Button
          variant="outline"
          colorScheme="white"
          onClick={openMetadataModal}
          mb={3}
          leftIcon={<ViewIcon />}
        >
          View Metadata
        </Button>
        {variant?.meta_url && <IpfsUrl url={variant.meta_url} />}

        <Modal
          isOpen={isMetadataModalOpen}
          onClose={closeMetadataModal}
          size="6xl"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalCloseButton />
            <CodePreview
              code={JSON.stringify(metadata, null, 2)}
              language="json"
            />
          </ModalContent>
        </Modal>
      </Box>
    </Container>
  );
};
