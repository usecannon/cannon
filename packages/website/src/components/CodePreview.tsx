import { FC } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import solidity from 'react-syntax-highlighter/dist/esm/languages/prism/solidity';
import toml from 'react-syntax-highlighter/dist/esm/languages/prism/toml';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';

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
    return <div>{code}</div>;
  } else {
    return (
      <SyntaxHighlighter language={language} style={oneDark} wrapLongLines>
        {code}
      </SyntaxHighlighter>
    );
  }
};
