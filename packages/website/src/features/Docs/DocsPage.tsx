'use client';
import { CodePreview } from '@/components/CodePreview';
import {
  Text,
  Code,
  Container,
  Heading,
  Grid,
  GridItem,
  Button,
  Flex,
  Box,
} from '@chakra-ui/react';
import { FC, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { IContentList } from '@/helpers/markdown';
import { headingToId } from '@/helpers/markdown';
import { DocsMenu } from './DocsMenu';

interface IDocsPageProps {
  contents: {
    [key: string]: {
      list: IContentList;
      md: string;
    };
  };
}

enum DocsPageType {
  OVERVIEW,
  TECHNICAL,
}

export const DocsPage: FC<IDocsPageProps> = ({ contents }) => {
  const [tabIndex, setTabIndex] = useState(DocsPageType.OVERVIEW);
  console.log('contents', contents.overview.list);
  return (
    <Container maxW="container.lg">
      <Grid templateColumns="repeat(12, 1fr)" gap={6}>
        <GridItem colSpan={3}>
          <Box position="sticky" top={8}>
            <Flex justifyContent="space-between">
              <Button
                onClick={() => setTabIndex(DocsPageType.OVERVIEW)}
                isActive={tabIndex === DocsPageType.OVERVIEW}
                size="xs"
                colorScheme="teal"
              >
                OVERVIEW
              </Button>
              <Button
                onClick={() => setTabIndex(DocsPageType.TECHNICAL)}
                isActive={tabIndex === DocsPageType.TECHNICAL}
                size="xs"
                colorScheme="teal"
              >
                TECH REFERENCE
              </Button>
            </Flex>
            {tabIndex === DocsPageType.OVERVIEW ? (
              <DocsMenu list={contents.overview.list} />
            ) : (
              <DocsMenu list={contents.technical.list} />
            )}
          </Box>
        </GridItem>
        <GridItem colSpan={9}>
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
            {tabIndex === 0 ? contents.overview.md : contents.technical.md}
          </ReactMarkdown>
        </GridItem>
      </Grid>
    </Container>
  );
};
