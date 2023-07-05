import { FC } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import style from './codePreview.module.scss';
interface ICodePreviewProps {
  code: string;
  language: string;
}
export const CodePreview: FC<ICodePreviewProps> = ({ code, language }) => {
  return (
    <div className={style.wrapper}>
      <SyntaxHighlighter language={language} style={oneDark}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
};
