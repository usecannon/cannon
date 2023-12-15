import { LinkIcon } from '@chakra-ui/icons';
import PackageTable from './PackageTable';
import { Package } from '@/types/graphql/graphql';
import { Box, Flex, Heading, Link } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FC } from 'react';

interface IPackageCardProps {
  pkg: Package;
  maxHeight?: string;
}

export const PackageCard: FC<IPackageCardProps> = ({ pkg, maxHeight }) => {
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
      position="relative"
      _after={{
        content: '""',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent)',
        pointerEvents: 'none',
      }}
    >
      <Flex bg="gray.800" p={2} borderBottom="1px solid" borderColor="gray.600">
        <Heading as="h4" p={1} size="sm">
          {pkg.name}
        </Heading>
        <Link
          as={NextLink}
          href={'/packages/' + pkg.name}
          display="inline-block"
          ml="auto"
          mr={1}
        >
          <LinkIcon />
        </Link>
      </Flex>

      <Box verticalAlign="middle" overflow="auto" maxHeight={maxHeight}>
        <PackageTable latestOnly={false} pkg={pkg} />
      </Box>
    </Box>
  );
};
