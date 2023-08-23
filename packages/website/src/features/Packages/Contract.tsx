import React, { FC, useMemo, useState } from 'react';
import { Abi as AbiType } from 'abitype';
import { ChainArtifacts } from '@usecannon/builder';
import { useCopy } from '@/lib/copy';
import { Box, Button, Code, Flex, Heading, Link } from '@chakra-ui/react';
import { Abi } from '@/features/Packages/Abi';
import { Copy } from 'react-feather';

export const Contract: FC<{
  title: string;
  address: string;
  abi: AbiType;
  cannonOutputs: ChainArtifacts;
  chainId: number;
}> = ({ title, address, abi, cannonOutputs, chainId }) => {
  const [show, setShow] = useState(false);
  const anchor = useMemo(() => {
    const currentHash = window.location.hash.replace('#', '').split('-')[0];
    return currentHash + '-' + address;
  }, [address]);

  const copyToClipboard = useCopy();
  const copy = () => {
    void copyToClipboard(address);
  };

  const adjustScroll = () => {
    setTimeout(() => {
      window.scrollBy(0, -120);
    }, 1);
  };

  return (
    <Box
      mb="4"
      borderRadius="4px"
      p="4"
      border="1px solid rgba(255,255,255,0.2)"
      bg="blackAlpha.500"
    >
      <Flex mb="2" alignItems="center">
        <Heading id={anchor} mb="1" size="md" display="inline-block">
          {title}
        </Heading>
        <Link
          href={'#' + anchor}
          fontSize="sm"
          ml="2"
          color="gray.400"
          textDecoration="none"
          _hover={{ textDecoration: 'none' }}
          onClick={adjustScroll}
        >
          #
        </Link>
        <Flex ml="auto" gap={1} alignItems="center" cursor="pointer">
          <Code display="inline" bg="transparent" color="gray.200">
            {address}
          </Code>
          <Box onClick={copy} className="copy-button">
            <Copy size={16} />
          </Box>
        </Flex>
      </Flex>
      {/*  TODO: Implement the collapse */}
      {/*<Collapse isOpen="show">*/}
      {show && (
        <Abi
          abi={abi}
          address={address}
          cannonOutputs={cannonOutputs}
          chainId={chainId}
        />
      )}
      {/*</Collapse>*/}
      <Button
        colorScheme="blue"
        variant="outline"
        onClick={() => setShow(!show)}
        size="xs"
      >
        {show ? 'Hide' : 'Show'} contract functions
      </Button>
    </Box>
  );
};
