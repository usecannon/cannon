import { FC } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import solidity from 'react-syntax-highlighter/dist/esm/languages/prism/solidity';
import toml from 'react-syntax-highlighter/dist/esm/languages/prism/toml';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import { Box, Code } from '@chakra-ui/react';
import styled from 'styled-components';

SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('solidity', solidity);
SyntaxHighlighter.registerLanguage('toml', toml);
SyntaxHighlighter.registerLanguage('javascript', javascript);

const StyledHighlighter = styled(SyntaxHighlighter)`
  & span {
    background: #171b21;
  }
`;

interface ICodePreviewProps {
  code: string | string[];
  language: string;
}

const SIZE_LIMIT = 500000; // 0.5MB

export const CodePreview: FC<ICodePreviewProps> = ({ code, language }) => {
  if (code.length > SIZE_LIMIT) {
    return (
      <Code
        display="block"
        whiteSpace="pre"
        variant="subtle"
        p="1em"
        fontSize="md"
        bgColor="gray.800"
        color="rgb(171, 178, 191)"
      >
        {code}
      </Code>
    );
  } else {
    return (
      <Box backgroundColor="gray.800" borderRadius="md">
        <StyledHighlighter
          customStyle={{ margin: 0, background: 'none' }}
          language={language}
          style={oneDark}
          wrapLongLines
        >
          {code}
        </StyledHighlighter>
      </Box>
    );
  }
};
