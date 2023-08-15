import { GetPackagesQuery } from '@/types/graphql/graphql';
import { FC, useEffect, useMemo, useState } from 'react';
import { Box, Text, Button, Spinner, Heading } from '@chakra-ui/react';
import chainData from '@/constants/chainsData';
import axios from 'axios';
import pako from 'pako';
import { ChainArtifacts } from '@usecannon/builder';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { Copy } from 'react-feather';
import 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';
import { useCopy } from '@/lib/copy';
import { CodePreview } from '@/components/CodePreview';
import { getOutput } from '@/lib/builder'; //Example style, you can use another
import style from './packageNetworks.module.scss';

type Package = GetPackagesQuery['packages'][0];
type Tag = Package['tags'][0];

const PackageNetworks: FC<{
  p: Package | Pick<Tag, 'variants'>;
  download?: boolean;
}> = ({ p, download = false }) => {
  const chains = useMemo(() => {
    let variants: Tag['variants'] | undefined = [];

    if ('tags' in p) {
      const latestTag = p.tags?.find((t) => t.name == 'latest');
      variants = latestTag?.variants?.filter((v) => v.preset == 'main') || [];
    } else if ('variants' in p) {
      variants = p.variants || [];
    }
    return variants
      ?.map((v) => {
        return { id: v.chain_id, url: v?.deploy_url, ...chainData[v.chain_id] };
      })
      .sort((a, b) => {
        if (a.id === 13370) {
          return -1;
        } else if (b.id === 13370) {
          return 1;
        } else {
          return a.id - b.id;
        }
      });
  }, [p]);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [ipfs, setIpfs] = useState<{ state: any; def: any }>({
    state: {},
    def: {},
  });

  const [deployData, setDeployData] = useState('');
  const [deployUrl, setDeployUrl] = useState('');

  useEffect(() => {
    const artifacts: ChainArtifacts = getOutput(ipfs);

    const _deployData = JSON.stringify(artifacts?.contracts, null, 2);
    setDeployData(_deployData);
  }, [ipfs]);

  // TODO: Remove unused chainId param? (added console.log to fix TS build)
  const openModal = async (url: string) => {
    setIsOpen(true);
    setDeployUrl(url);

    setLoading(true);
    const response = await axios.get(
      `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`,
      { responseType: 'arraybuffer' }
    );

    // Parse IPFS data
    const uint8Array = new Uint8Array(response.data);
    const inflated = pako.inflate(uint8Array);
    const raw = new TextDecoder().decode(inflated);
    setIpfs(JSON.parse(raw));
    setLoading(false);
  };

  const closeModal = () => {
    setIsOpen(false);
    setDeployUrl('');
    setDeployData('');
    setIpfs({ state: {}, def: {} });
  };

  const copyToClipboard = useCopy();
  const copy = () => {
    void copyToClipboard(deployData);
  };
  return (
    <Box verticalAlign="middle">
      <Text
        height="24px"
        fontSize="sm"
        display="inline-block"
        mr="2"
        transform="translateY(-4px)"
        opacity="0.8"
      >
        <strong>
          {download ? 'Download ' : ''}Deployment{download ? ' Data' : 's'}:
        </strong>
      </Text>
      {chains?.map((chain) => {
        return (
          <Button
            size="xs"
            mr="2"
            mb="2"
            key={chain.id}
            colorScheme={chain.color || 'whiteAlpha'}
            color="white"
            opacity="download ? '0.8' : '0.7 !important'"
            isDisabled={!download}
            className={!download ? 'disabled-button' : ''}
            onClick={() => {
              if (download) {
                void openModal(chain.url);
              }
            }}
          >
            {chain.name || chain.id}
          </Button>
        );
      })}

      <Modal size="5xl" isOpen={isOpen} onClose={closeModal}>
        {/*<ModalContent bg="black" color="white" ref="content"> TODO: literal as ref value is forbidden*/}

        <ModalOverlay id="modal-overlay" className={style.modalOverlay} />
        <ModalContent id="modal-content" bg="black" color="white">
          <ModalHeader>
            <Heading size="lg">Contract Addresses + ABIs</Heading>
          </ModalHeader>
          <ModalCloseButton onClick={closeModal} />
          <ModalBody>
            {loading && (
              <Box py="20" textAlign="center">
                <Spinner />
              </Box>
            )}
            {deployUrl ? (
              <Box>
                <Button
                  bgColor="teal"
                  color="white"
                  mb="3"
                  bg="teal.600"
                  onClick={copy}
                >
                  <Copy className="copy-button" />
                  &nbsp;Copy to clipboard
                </Button>
                <CodePreview code={deployData} language={'json'} />
              </Box>
            ) : (
              <Box textAlign="center" py="20" opacity="0.5">
                Contract Addresses & ABIs unavailable
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PackageNetworks;
