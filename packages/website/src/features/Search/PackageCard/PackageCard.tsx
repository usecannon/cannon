import PackageTable from './PackageTable';
import { GetPackagesQuery } from '@/types/graphql/graphql';
import { Box, Flex, Heading } from '@chakra-ui/react';
import { FC } from 'react';

interface IPackageCardProps {
  pkg: GetPackagesQuery['packages'][0];
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
        </Heading>
      </Flex>
      <PackageTable pkg={pkg} />
    </Box>
  );
};
