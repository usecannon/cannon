import { find, merge } from 'lodash';
import { FC, useMemo } from 'react';
import { Flex, Box, Text } from '@chakra-ui/react';
import * as chains from 'wagmi/chains';
//import chainsData from '@/constants/chainsData';

type ChainData = {
  id: number;
  name: string;
  color?: string;
  [key: string]: any; // This allows for additional properties without having to specify each one.
};

const metadata = {
  arbitrum: {
    color: '#96bedc',
  },
  avalanche: {
    color: '#e84141',
  },
  base: {
    color: '#0052ff',
  },
  bsc: {
    color: '#ebac0e',
  },
  cronos: {
    color: '#002D74',
  },
  mainnet: {
    color: '#37367b',
  },
  hardhat: {
    color: '#f9f7ec',
  },
  optimism: {
    color: '#ff5a57',
  },
  polygon: {
    color: '#9f71ec',
  },
  zora: {
    color: '#000000',
  },
};

const newChain = {
  id: 13370,
  name: 'Cannon',
  color: 'gray.400',
};

// Also see https://github.com/rainbow-me/rainbowkit/blob/7b31af2431cda62bf215a84b9d40fb7f66f24381/packages/rainbowkit/src/components/RainbowKitProvider/provideRainbowKitChains.ts
const Chain: FC<{
  id: number;
  isSmall?: boolean;
}> = ({ id, isSmall }) => {
  const chain = useMemo(() => {
    const enrichedChainData: Record<string, ChainData> = {
      ...merge({ cannon: newChain }, chains, metadata),
    };
    return find(enrichedChainData, (chain: ChainData) => chain.id === id);
  }, [id]);

  const name = chain?.name || 'Unknown Chain';
  const color = chain?.color || 'gray.600';
  return (
    <Flex gap={1.5} alignItems="baseline">
      <Box h="0.66rem" w="0.66rem" borderRadius={999} bg={color} />
      {!isSmall && (
        <>
          {name}
          <Text fontSize="xs" color="gray.500" letterSpacing={'-0.3px'}>
            ID {id}
          </Text>
        </>
      )}
    </Flex>
  );
};

export default Chain;
