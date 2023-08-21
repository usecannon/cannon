'use client';
import { CodePreview } from '@/components/CodePreview';
import {
  Text,
  Code,
  Table,
  TableCaption,
  Tbody,
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
import remarkGfm from 'remark-gfm'


interface IDocsPageProps {
  list: IContentList;
  md: string;
}

export const DocsSpecPage: FC<IDocsPageProps> = ({ list, md }) => {
  md = md.replaceAll(RegExp(/^(Ƭ \*\*RawChainDefinition\*\*: `Object`|Ƭ \*\*Config\*\*: `Object`)$/, 'gm'), '')

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
              🚧&nbsp;&nbsp;Cannon’s documentation is currently under
              construction.
            </AlertTitle>
          </Alert>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ ...props }) => <Text {...props} mt={4} />,
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
              h1: ({ ...props }) => null,
              h3: ({ ...props }) => null,
              h4: ({ ...props }) => null,
              a: ({ ...props }) => null,
              table: ({ children, ...props }) => (
                <Table m={10} variant='unstyled'>
                  <Tbody children={children}></Tbody>
                </Table>
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
