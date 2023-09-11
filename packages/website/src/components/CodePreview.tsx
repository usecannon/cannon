import { FC } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import solidity from 'react-syntax-highlighter/dist/esm/languages/prism/solidity';
import toml from 'react-syntax-highlighter/dist/esm/languages/prism/toml';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import { Code } from '@chakra-ui/react';

SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('solidity', solidity);
SyntaxHighlighter.registerLanguage('toml', toml);
SyntaxHighlighter.registerLanguage('javascript', javascript);

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
        bgColor="rgb(40, 44, 52)"
        color="rgb(171, 178, 191)"
      >
        {code}
      </Code>
    );
  } else {
    return (
      <SyntaxHighlighter
        customStyle={{ margin: 0 }}
        language={language}
        style={oneDark}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    );
  }
};
