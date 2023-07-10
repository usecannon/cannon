'use client';
import { IContentList } from '@/app/docs/page';
import { Container, Heading } from '@chakra-ui/react';
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
          // Map `h1` (`# heading`) to use `h2`s.
          h1: Heading,
          // Rewrite `em`s (`*like so*`) to `i` with a red foreground color.
          em: ({ ...props }) => <i style={{ color: 'red' }} {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </Container>
  );
};
