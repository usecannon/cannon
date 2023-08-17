import PackageNetworks from '@/components/PackageNetworks';
import { GetPackagesQuery } from '@/types/graphql/graphql';
import { Box, Flex, Heading } from '@chakra-ui/react';
import { FC } from 'react';
import PublishInfo from './PublishInfo';
import NextLink from 'next/link';

interface IPackageCardProps {
  pkg: GetPackagesQuery['packages'][0];
}

export const PackageCard: FC<IPackageCardProps> = ({ pkg }) => {
  return (
    <NextLink href={`/packages/${pkg.name}`}>
      <Box
        key={pkg.name}
        p="6"
        bg="black"
        display="block"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="gray.600"
        mb="6"
        borderRadius="4px"
        _hover={{ borderColor: 'gray.500' }}
        transition="0.12s"
      >
        <Flex alignItems="['', 'center']" direction={['column', 'row']} mb="2">
          <Heading as="h4" size="md" mb={[1, 0]}>
            {pkg.name}
          </Heading>
          <Box ml={[0, 'auto']}>
            <PublishInfo p={pkg} />
          </Box>
        </Flex>
        <PackageNetworks p={pkg} />
      </Box>
    </NextLink>
  );
};
