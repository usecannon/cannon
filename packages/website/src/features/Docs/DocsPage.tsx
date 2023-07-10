'use client';
import { IContentList } from '@/app/docs/page';
import { CodePreview } from '@/components/CodePreview';
import { Text, Code, Container, Heading } from '@chakra-ui/react';
import { FC } from 'react';
import ReactMarkdown from 'react-markdown';

interface IDocsPageProps {
  content: string;
  list: IContentList;
}

export const DocsPage: FC<IDocsPageProps> = ({ content }) => {
  return (
    <Container maxW="container.lg">
      <ReactMarkdown
        components={{
          p: ({ ...props }) => <Text {...props} mt={4} />,
          h1: ({ ...props }) => <Heading as="h1" {...props} mb={4} />,
          h2: ({ ...props }) => (
            <Heading as="h2" {...props} mb={4} pt={8} fontSize={24} />
          ),
          h3: ({ ...props }) => (
            <Heading as="h3" {...props} mb={4} pt={8} fontSize={20} />
          ),
          code: ({ inline, className, ...props }) => {
            const lang = className?.replace('language-', '') || 'javascript';
            console.log('props.children', props.children);
            return inline ? (
              <Code colorScheme="blackAlpha" variant="solid" {...props} />
            ) : (
              <CodePreview
                // @ts-ignore
                code={props.children || ''}
                language={lang}
                {...props}
              />
            );
          },
          // Rewrite `em`s (`*like so*`) to `i` with a red foreground color.
          // em: ({ ...props }) => <i style={{ color: 'red' }} {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </Container>
  );
};
