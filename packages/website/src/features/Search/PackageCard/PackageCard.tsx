import { LinkIcon } from '@chakra-ui/icons';
import PackageTable from './PackageTable';
import { Package } from '@/types/graphql/graphql';
import { Box, Flex, Heading, Link } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FC } from 'react';

interface IPackageCardProps {
  pkg: Package;
}

export const PackageCard: FC<IPackageCardProps> = ({ pkg }) => {
  return (
    <Box
      key={pkg.name}
      bg="black"
      display="block"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="gray.600"
      borderRadius="4px"
      transition="all 0.12s"
      overflow="hidden"
    >
      <Flex bg="gray.800" p={2} borderBottom="1px solid" borderColor="gray.600">
        <Heading as="h4" p={1} size="sm">
          {pkg.name}
          <Link as={NextLink} href={'/packages/' + pkg.name} ml={1.5}>
            <LinkIcon boxSize={3.5} />
          </Link>
        </Heading>
      </Flex>
      <PackageTable pkg={pkg} />
    </Box>
  );
};
