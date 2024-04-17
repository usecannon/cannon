import { FC, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface ICodePreviewProps {
  code: string;
  language?: string;
  height?: string | number | undefined;
  line?: number; // The line to highlight
}

export const CodePreview: FC<ICodePreviewProps> = ({
  code,
  language,
  height = '190px',
  line,
}) => {
  const editorRef = useRef<any>(null);

  // Function to highlight lines
  const highlightLines = (editor: any, monaco: any, line: number) => {
    // Only create the range if the line is provided
    const newDecorations = [
      {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'myInlineDecoration',
          glyphMarginClassName: 'myGlyphMarginClass',
        },
      },
    ];

    editor.deltaDecorations([], newDecorations); // Apply decorations}

    editor.revealLineInCenter(line);
  };

  // Handle editor mount and save the instance
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    if (line) {
      highlightLines(editor, monaco, line + 1);
    }
  };

  // call highlightLines until the editor is mounted

  return (
    <Editor
      height={height}
      theme="vs-dark"
      defaultLanguage={language || 'javascript'}
      value={code}
      options={{ readOnly: true }}
      onMount={handleEditorDidMount}
    />
  );
};

export default CodePreview;
