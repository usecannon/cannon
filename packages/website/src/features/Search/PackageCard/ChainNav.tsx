import { FC } from 'react';
import { Button, Tooltip, Flex } from '@chakra-ui/react';
import NextLink from 'next/link';
import Chain from './Chain';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

const ChainNav: FC<{
  variants: any[];
  packageName: string;
}> = ({ variants, packageName }) => {
  const { getChainById } = useCannonChains();
  const sortedVariants = [...variants].sort((a, b) => {
    if (a.chain_id === 13370) return -1;
    if (b.chain_id === 13370) return 1;
    return a.chain_id - b.chain_id;
  });

  return (
    <Flex gap={2}>
      {sortedVariants.map((variant) => (
        <Tooltip
          key={variant.id}
          placement="top"
          label={
            getChainById(variant.chain_id)?.name + ` (ID ${variant.chain_id})`
          }
        >
          <Button
            as={NextLink}
            p={1}
            size="xs"
            variant="outline"
            colorScheme="black"
            border="1px solid"
            borderColor="gray.500"
            backgroundColor="gray.900"
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
