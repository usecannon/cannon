import { links } from '@/constants/links';
import { InfoIcon } from '@chakra-ui/icons';
import {
  Box,
  Link,
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Text,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { FC } from 'react';
import Chain from './PackageCard/Chain';

interface ChainFilterProps {
  id: number;
  isSelected: boolean;
  toggleSelection: (id: number) => void;
}

export const ChainFilter: FC<ChainFilterProps> = ({
  id,
  isSelected,
  toggleSelection,
}) => {
  return (
    <Box
      cursor="pointer"
      display="flex"
      alignItems="center"
      borderWidth="1px"
      borderColor={isSelected ? 'gray.700' : 'gray.700'}
      bg={isSelected ? 'gray.700' : ''}
      key={id}
      mb={2}
      px={2}
      py={1}
      borderRadius="md"
      _hover={{ background: isSelected ? 'whiteAlpha.200' : 'blackAlpha.400' }}
      onClick={() => toggleSelection(id)}
    >
      <Chain id={id} />
      {id === 13370 && (
        <Box ml="auto">
          <Popover trigger="hover">
            <PopoverTrigger>
              <InfoIcon color="gray.300" />
            </PopoverTrigger>
            <Portal>
              <PopoverContent
                onClick={(e) => e.stopPropagation()}
                background="gray.700"
                maxWidth="250px"
                borderColor="gray.800"
              >
                <PopoverArrow bg="gray.700" />
                <Text p={2} fontSize="sm" color="gray.200">
                  These packages can be{' '}
                  <Link as={NextLink} href={links.DOCS_CLI_RUN}>
                    run locally
                  </Link>{' '}
                  and{' '}
                  <Link as={NextLink} href={links.DOCS_CANNONFILE_PROVISION}>
                    deployed by cannonfiles
                  </Link>
                  .
                </Text>
              </PopoverContent>
            </Portal>
          </Popover>
        </Box>
      )}
    </Box>
  );
};
