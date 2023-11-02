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
    <Flex flex="1" direction="column" maxHeight="100%" maxWidth="100%">
      <Flex flex="1" direction={['column', 'column', 'row']}>
        <Flex
          flexDirection="column"
          overflowY="auto"
          maxWidth={['100%', '100%', '240px']}
          borderRight={isSmall ? 'none' : '1px solid'}
          borderBottom={isSmall ? '1px solid' : 'none'}
          borderColor={isSmall ? 'gray.600' : 'gray.700'}
          width={['100%', '100%', '240px']}
          maxHeight={['140px', '140px', 'calc(100vh - 151px)']}
        >
          <Box px={3} pb={2}>
            <DocsSidebar list={list} />
          </Box>
        </Flex>

        <Box
          flex="1"
          overflowY="auto"
          maxHeight={['none', 'none', 'calc(100vh - 151px)']}
          background="gray.800"
        >
          <Container maxW="container.xl" ml={0} py={4}>
            <Alert bg="gray.900">
              <AlertTitle>
                🚧&nbsp;&nbsp;Cannon&apos;s documentation is currently under
                construction.
              </AlertTitle>
            </Alert>
            {children}
          </Container>
        </Box>
      </Flex>
    </Flex>
  );
};
