'use client';
import { CodePreview } from '@/components/CodePreview';
import {
  Text,
  Code,
  Container,
  Heading,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import { IContentList } from '@/helpers/markdown';
import { headingToId } from '@/helpers/markdown';

interface IDocsPageProps {
  contents: {
    [key: string]: {
      list: IContentList;
      md: string;
    };
  };
}

export const DocsPage: FC<IDocsPageProps> = ({ contents }) => {
  const content = contents.overview.md;
  return (
    <Container maxW="container.lg">
      <Grid templateColumns="repeat(12, 1fr)" gap={6}>
        <GridItem colSpan={3}>Menu</GridItem>
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
                console.log('props.children', props.children);
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
            {content}
          </ReactMarkdown>
        </GridItem>
      </Grid>
    </Container>
  );
};
