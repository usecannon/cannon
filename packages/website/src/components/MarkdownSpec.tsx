'use client';

import { CodePreview } from '@/components/CodePreview';
import { Text, Code, Heading, Table } from '@chakra-ui/react';
import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { headingToId } from '@/helpers/markdown';
import style from './markdownSpec.module.scss';

interface IDocsPageProps {
  md: string;
}

export const MarkdownSpec: FC<IDocsPageProps> = ({ md }) => {
  return (
    <ReactMarkdown
      className={style.markdownComp}
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ ...props }) => <Text {...props} mt={4} />,
        h1: () => null,
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
        h3: () => null,
        h4: () => null,
        a: () => null,
        table: ({ children }) => (
          <Table m={5} variant="simple">
            {children}
          </Table>
        ),
        code: ({ inline, className, ...props }) => {
          const lang = className?.replace('language-', '') || 'javascript';
          return inline ? (
            <Code colorScheme="blackAlpha" variant="solid">
              {props.children}
            </Code>
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
  );
};
