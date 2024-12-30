import { FC, useRef, useEffect } from 'react';
import Editor, { type EditorProps, loader } from '@monaco-editor/react';
import { createGlobalStyle } from 'styled-components';

// Define the GitHub Dark Default theme
const githubDarkDefault = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: '', foreground: '#c9d1d9', background: '#0d1117' },
    { token: 'comment', foreground: '#8b949e' },
    { token: 'keyword', foreground: '#ff7b72' },
    { token: 'string', foreground: '#a5d6ff' },
    { token: 'number', foreground: '#79c0ff' },
    { token: 'regexp', foreground: '#a5d6ff' },
    { token: 'type', foreground: '#ff7b72' },
    { token: 'class', foreground: '#ffa657' },
    { token: 'function', foreground: '#d2a8ff' },
    { token: 'variable', foreground: '#ffa657' },
    { token: 'constant', foreground: '#79c0ff' },
  ],
  colors: {
    'editor.background': '#000000',
    'editor.foreground': '#c9d1d9',
    'editor.lineHighlightBackground': '#161b22',
    'editor.selectionBackground': '#264f78',
    'editorCursor.foreground': '#c9d1d9',
    'editorWhitespace.foreground': '#484f58',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#30363d',
  },
};

const EditorStyles = createGlobalStyle`
  .myInlineDecoration {
    cursor: pointer;
    text-decoration: underline;
    font-weight: bold;
    font-style: oblique;
    background-color: #338fff6c;
  }
`;

interface ICodePreviewProps {
  code: string;
  language?: string;
  height?: string | number | undefined;
  line?: number; // The line to highlight
  editorProps?: EditorProps;
}

export const CodePreview: FC<ICodePreviewProps> = ({
  code,
  language,
  line,
  height,
  editorProps,
}) => {
  const editorRef = useRef<any>(null);

  // Initialize theme
  useEffect(() => {
    loader.init().then((monaco) => {
      monaco.editor.defineTheme('github-dark-default', githubDarkDefault);
    });
  }, []);

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
    monaco.editor.setTheme('github-dark-default');
    editorRef.current = editor;
    if (line) {
      highlightLines(editor, monaco, line + 1);
    }
  };

  return (
    <>
      <EditorStyles />
      <Editor
        height={height || '100%'}
        theme="github-dark-default"
        defaultLanguage={language || 'javascript'}
        value={code}
        options={{
          readOnly: true,
          minimap: { enabled: false },
        }}
        onMount={handleEditorDidMount}
        {...editorProps}
      />
    </>
  );
};

export default CodePreview;
