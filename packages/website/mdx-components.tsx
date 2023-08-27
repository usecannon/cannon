import type { MDXComponents } from 'mdx/types';
import { Text, Code, Heading } from '@chakra-ui/react';
import { headingToId } from '@/helpers/markdown';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
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
    code: ({ ...props }) => (
      <Code colorScheme="blackAlpha" variant="solid" {...props} />
    ),
    Alert: ({ ...props }) => (
      <div
        style={{
          padding: 20,
          backgroundColor: 'rgb(14 28 60)',
          marginBottom: 20,
          border: '1px solid rgb(13 20 38)',
        }}
      >
        {props.children}
      </div>
    ),
    ...components,
  };
}
