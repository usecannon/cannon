import { LinkIcon } from '@chakra-ui/icons';
import PackageTable from './PackageTable';
import { Package } from '@/types/graphql/graphql';
import {
  Box,
  Flex,
  Heading,
  Link,
  useDisclosure,
  Button,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { FC } from 'react';

interface IPackageCardProps {
  pkg: Package;
  maxHeight?: string;
}

export const PackageCardExpandable: FC<IPackageCardProps> = ({
  pkg,
  maxHeight,
}) => {
  const { isOpen, onToggle } = useDisclosure();

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
      <Flex bg="gray.800" flexDirection="row" alignItems="center" p={2}>
        <Box px={1}>
          <Heading display="inline-block" as="h4" size="sm">
            {pkg.name}
          </Heading>
          <Link
            as={NextLink}
            href={'/packages/' + pkg.name}
            display="inline-block"
            ml={1.5}
            transform="translateY(-1px)"
          >
            <LinkIcon boxSize="3" />
          </Link>
        </Box>
        <Box ml="auto">
          <Button
            size="xs"
            variant="outline"
            colorScheme="black"
            fontWeight={500}
            textTransform="uppercase"
            letterSpacing="1px"
            fontFamily="var(--font-miriam)"
            textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
            fontSize="12px"
            background="gray.900"
            borderColor="gray.500"
            _hover={{
              background: 'gray.800',
            }}
            onClick={onToggle}
          >
            {isOpen ? 'Show Less' : 'Show More'}
          </Button>
        </Box>
      </Flex>
      <Box verticalAlign="middle" overflow="auto" maxHeight={maxHeight}>
        <PackageTable latestOnly={!isOpen} pkg={pkg} />
      </Box>
    </Box>
  );
};
