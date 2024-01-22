import { FC, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';

interface ICodePreviewProps {
  code: string;
  language?: string;
  height?: string | number | undefined;
}

export const CodePreview: FC<ICodePreviewProps> = ({
  code,
  language,
  height,
}) => {
  console.log('language: ', language);
  // const monaco = useMonaco();

  return (
    <Editor
      height={height}
      theme="vs-dark"
      defaultLanguage={language}
      defaultValue={code}
      options={{ readOnly: true }}
    />
  );
};
