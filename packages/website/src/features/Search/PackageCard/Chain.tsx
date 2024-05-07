import { FC, useMemo } from 'react';
import { Flex, Box, Text } from '@chakra-ui/react';
import { chainsById } from '@/helpers/chains';
import { Image } from '@chakra-ui/react';

export type ChainData = {
  id: number;
  name: string;
  color?: string;
  [key: string]: any; // This allows for additional properties without having to specify each one.
  hideId?: boolean;
};

// Also see https://github.com/rainbow-me/rainbowkit/blob/7b31af2431cda62bf215a84b9d40fb7f66f24381/packages/rainbowkit/src/components/RainbowKitProvider/provideRainbowKitChains.ts
const Chain: FC<{
  id: number;
  isSmall?: boolean;
  chainData?: ChainData;
  hideId?: boolean;
}> = ({ id, isSmall, hideId }) => {
  const chain = useMemo(() => chainsById[id], [id]);

  const name = chain?.name || 'Unknown Chain';
  const color = chain?.color || 'gray.600';
  return (
    <Flex gap={1.5} alignItems={isSmall ? 'center' : 'baseline'}>
      {id === 13370 ? (
        <Image
          display="block"
          src="/images/logomark.svg"
          alt="Cannon"
          h="0.75rem"
          w="0.75rem"
          transform="scale(2.1) translateY(-0.01rem)"
          objectFit="cover"
        />
      ) : (
        <Box h="0.75rem" w="0.75rem" borderRadius={999} bg={color} />
      )}
      {!isSmall && (
        <>
          {name}
          {!hideId && (
            <Text fontSize="xs" color="gray.500" letterSpacing={'-0.3px'}>
              ID {id}
            </Text>
          )}
        </>
      )}
    </Flex>
  );
};

export default Chain;
