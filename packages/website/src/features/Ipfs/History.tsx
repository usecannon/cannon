'use client';

import {
  Box,
  Text,
  Heading,
  List,
  ListItem,
  ListIcon,
  Link,
  HStack,
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { ItemBase } from '@/helpers/db';

interface HistoryProps {
  items: ItemBase[];
}

export function History({ items }: HistoryProps) {
  return (
    <Box
      p={6}
      bg="gray.800"
      display="block"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="gray.600"
      borderRadius="4px"
    >
      <Heading paddingBottom="4" size="md" mb="4">
        History
      </Heading>
      <List>
        {items.map((item) => (
          <ListItem mb="2" key={item.id}>
            <HStack>
              <Text fontFamily="mono">
                <ListIcon as={ChevronRightIcon} color="white" />
                <Link
                  href={`/ipfs?cid=${item.id}&compressed=${item.compressed}`}
                >
                  ipfs://{item.id}
                </Link>
              </Text>
              <Text fontSize={'xs'} fontWeight={'ligther'} color={'grey.500'}>
                ({new Date(item.createdAt).toLocaleDateString('en-US')})
              </Text>
            </HStack>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
