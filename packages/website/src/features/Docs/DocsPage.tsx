'use client';
import { CodePreview } from '@/components/CodePreview';
import {
  Text,
  Code,
  Flex,
  Heading,
  Box,
  useBreakpointValue,
  Alert,
  AlertTitle,
  Container,
} from '@chakra-ui/react';
import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import { IContentList } from '@/helpers/markdown';
import { headingToId } from '@/helpers/markdown';
import { DocsSidebar } from './DocsSidebar';

interface IDocsPageProps {
  list: IContentList;
  md: string;
}

export const DocsPage: FC<IDocsPageProps> = ({ list, md }) => {
  const flexDirectionBreakpoint = useBreakpointValue({
    base: 'column',
    md: 'row',
  });
  const borderBreakpoint = useBreakpointValue({
    base: 'none',
    md: '1px solid',
  });

  return (
    <Flex flex="1" w="100%" flexDirection={flexDirectionBreakpoint as any}>
      <Box
        p={8}
        borderRight={borderBreakpoint}
        borderColor="gray.700"
        flexShrink={0}
        flexGrow={1}
        overflowY="auto"
        maxWidth="300px"
      >
        <DocsSidebar list={list} />
      </Box>

      <Box p={8} flex={1} overflowY="auto">
        <Container maxW="container.xl" ml={0}>
          <Alert bg="gray.800" border="1px solid" borderColor="gray.700">
            <AlertTitle>
              🚧&nbsp;&nbsp;Cannon’s documentation is currently under
              construction.
            </AlertTitle>
          </Alert>
          <ReactMarkdown
            components={{
              p: ({ ...props }) => <Text {...props} mt={4} />,
              h1: ({ ...props }) => <Heading as="h1" {...props} mb={4} />,
              h2: ({ ...props }) => (
                <Heading
                  as="h2"
                  {...props}
                  mb={4}
                  pt={8}
                  fontSize={24}
                  id={headingToId(props)}
                />
              ),
              h3: ({ ...props }) => (
                <Heading
                  as="h3"
                  {...props}
                  mb={4}
                  pt={8}
                  fontSize={20}
                  id={headingToId(props)}
                />
              ),
              code: ({ inline, className, ...props }) => {
                const lang =
                  className?.replace('language-', '') || 'javascript';
                return inline ? (
                  <Code colorScheme="blackAlpha" variant="solid" {...props} />
                ) : (
                  <CodePreview
                    code={(props.children[0] as string) || ''}
                    language={lang}
                    {...props}
                  />
                );
              },
            }}
          >
            {md}
          </ReactMarkdown>
        </Container>
      </Box>
    </Flex>
  );
};
