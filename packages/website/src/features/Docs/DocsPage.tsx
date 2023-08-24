'use client';

import {
  Flex,
  Box,
  useBreakpointValue,
  Alert,
  AlertTitle,
  Container,
} from '@chakra-ui/react';
import { FC, ReactNode } from 'react';
import { IContentList } from '@/helpers/markdown';
import { DocsSidebar } from './DocsSidebar';

interface IDocsPageProps {
  list: IContentList;
  children?: ReactNode;
}

export const DocsPage: FC<IDocsPageProps> = ({ list, children }) => {
  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  return (
    <Flex flex="1" w="100%" flexDirection={isSmall ? 'column' : 'row'}>
      <Box
        p={isSmall ? 4 : 8}
        borderRight={isSmall ? 'none' : '1px solid'}
        borderColor="gray.700"
        flexShrink={0}
        flexGrow={isSmall ? 0 : 1}
        overflowY="auto"
        maxWidth="240px"
      >
        <DocsSidebar list={list} />
      </Box>
      <Box p={isSmall ? 0 : 8} flex={1} overflowY="auto">
        <Container maxW="container.xl" ml={0}>
          <Alert bg="gray.800" border="1px solid" borderColor="gray.700">
            <AlertTitle>
              🚧&nbsp;&nbsp;Cannon&apos;s documentation is currently under
              construction.
            </AlertTitle>
          </Alert>
          {children}
        </Container>
      </Box>
    </Flex>
  );
};
