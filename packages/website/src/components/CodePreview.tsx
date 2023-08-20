import { FC } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ICodePreviewProps {
  code: string | string[];
  language: string;
}
export const CodePreview: FC<ICodePreviewProps> = ({ code, language }) => {
  return (
    <SyntaxHighlighter language={language} style={oneDark} wrapLongLines>
      {code}
    </SyntaxHighlighter>
  );
};
