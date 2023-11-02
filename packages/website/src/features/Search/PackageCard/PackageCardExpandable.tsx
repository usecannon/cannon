import { LinkIcon } from '@chakra-ui/icons';
import PackageTable from './PackageTable';
import { Package } from '@/types/graphql/graphql';
import {
  Box,
  Collapse,
  Flex,
  Heading,
  Link,
  useDisclosure,
  Text,
  Button,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { FC } from 'react';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';
import ChainNav from './ChainNav';

interface IPackageCardProps {
  pkg: Package;
  maxHeight?: string;
}

export const PackageCardExpandable: FC<IPackageCardProps> = ({
  pkg,
  maxHeight,
}) => {
  const { isOpen, onToggle } = useDisclosure();

  const latestUpdate = pkg.variants.reduce((max, variant) => {
    return max > variant.last_updated ? max : variant.last_updated;
  }, pkg.variants[0]?.last_updated);

  const latestMainVariants = pkg.variants.filter(
    (variant) => variant.tag.name === 'latest' && variant.preset === 'main'
  );

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
      <Flex
        bg="gray.800"
        p={2}
        flexDirection={['column', 'column', 'row']}
        alignItems={['flex-start', 'flex-start', 'center']}
      >
        <Box py={2} px={[1, 1, 3]}>
          <Heading display="inline-block" as="h4" size="md" mb={1.5}>
            {pkg.name}
          </Heading>
          <Link
            as={NextLink}
            href={'/packages/' + pkg.name}
            display="inline-block"
            ml={2}
            transform="translateY(-2px)"
          >
            <LinkIcon />
          </Link>
          <PublishInfo p={{ last_updated: latestUpdate }} />
        </Box>
        <Box p={1} ml={[0, 0, 'auto']}>
          {latestMainVariants.length ? (
            <Flex
              mb="2"
              justifyContent={['flex-start', 'flex-start', 'flex-end']}
            >
              <ChainNav packageName={pkg.name} variants={latestMainVariants} />
            </Flex>
          ) : null}
          <Flex justifyContent={['flex-start', 'flex-start', 'flex-end']}>
            <Text fontSize="sm" color="gray.300" display="inline" mr={2}>
              {pkg.variants.length} variant
              {pkg.variants.length !== 1 ? 's' : ''}
            </Text>
            <Button
              size="xs"
              variant="outline"
              colorScheme="black"
              width="56px"
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
              {isOpen ? 'Hide' : 'Show'}
            </Button>
          </Flex>
        </Box>
      </Flex>
      <Collapse in={isOpen} animateOpacity>
        <Box
          borderTop="1px solid"
          borderColor="gray.600"
          position="relative"
          _after={{
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background:
              'linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent)',
            pointerEvents: 'none',
          }}
        >
          <Box verticalAlign="middle" overflow="auto" maxHeight={maxHeight}>
            <PackageTable pkg={pkg} />
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};
