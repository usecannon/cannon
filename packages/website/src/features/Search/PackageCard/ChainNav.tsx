import { FC } from 'react';
import { Button, Tooltip, Flex } from '@chakra-ui/react';
import { Variant } from '@/types/graphql/graphql';
import NextLink from 'next/link';
import Chain from './Chain';
import { find } from 'lodash';
import * as chains from 'wagmi/chains';

const ChainNav: FC<{
  variants: Variant[];
  packageName: string;
}> = ({ variants, packageName }) => {
  const sortedVariants = [...variants].sort((a, b) => {
    if (a.chain_id === 13370) return -1;
    if (b.chain_id === 13370) return 1;
    return a.chain_id - b.chain_id;
  });

  const chainName = (chainId: number) => {
    if (chainId == 13370) return 'Cannon';
    return find(chains, (chain) => chain.id === chainId)?.name;
  };

  return (
    <Flex gap={2}>
      {sortedVariants.map((variant) => (
        <Tooltip
          key={variant.id}
          placement="top"
          label={chainName(variant.chain_id) + ` (ID ${variant.chain_id})`}
        >
          <Button
            as={NextLink}
            size="xs"
            variant="outline"
            colorScheme="black"
            border="1px solid"
            borderColor="gray.500"
            backgroundColor="black"
            _hover={{ backgroundColor: 'gray.800' }}
            href={`/packages/${packageName}/${variant.tag.name}/${variant.chain_id}-${variant.preset}`}
          >
            <Chain id={variant.chain_id} isSmall />
          </Button>
        </Tooltip>
      ))}
    </Flex>
  );
};

export default ChainNav;
