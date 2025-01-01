import { FC, useRef, useEffect, useState } from 'react';
import Editor, { type EditorProps, loader } from '@monaco-editor/react';

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
    'editor.background': '#27272A80',
    'editor.foreground': '#c9d1d9',
    'editor.lineHighlightBackground': '#27272A80',
    'editor.selectionBackground': '#264f78',
    'editorCursor.foreground': '#c9d1d9',
    'editorWhitespace.foreground': '#484f58',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#30363d',
  },
};

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
  const [isThemeReady, setIsThemeReady] = useState(false);

  // Initialize theme before rendering editor
  useEffect(() => {
    async function initializeTheme() {
      try {
        const monaco = await loader.init();
        monaco.editor.defineTheme('github-dark-default', githubDarkDefault);
        setIsThemeReady(true);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }
    void initializeTheme();
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
    editorRef.current = editor;
    monaco.editor.setTheme('github-dark-default');

    if (line) {
      highlightLines(editor, monaco, line + 1);
    }
  };

  if (!isThemeReady) {
    return null; // or a loading spinner
  }

  return (
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
  );
};

export default CodePreview;
