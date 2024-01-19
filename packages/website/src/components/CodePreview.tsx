import { FC } from 'react';
import Editor from '@monaco-editor/react';

interface ICodePreviewProps {
  code: string;
  language?: string;
  height?: string | number | undefined
}

export const CodePreview: FC<ICodePreviewProps> = ({ code, language, height }) => {
    return (
        <Editor height={height} theme="vs-dark" defaultLanguage={language} defaultValue={code} />
    );
};
