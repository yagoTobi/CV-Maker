import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

interface LatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCompile: () => void;
  isCompiling: boolean;
  hasUnsavedChanges?: boolean;
}

export function LatexEditor({ value, onChange, onCompile, isCompiling, hasUnsavedChanges }: LatexEditorProps) {
  return (
    <div className="latex-editor">
      <div className="editor-toolbar">
        <button
          onClick={onCompile}
          disabled={isCompiling}
          className={`compile-btn ${hasUnsavedChanges ? 'has-changes' : ''}`}
        >
          {hasUnsavedChanges && <span className="pulse-indicator"></span>}
          {isCompiling ? 'Compiling...' : 'Compile PDF'}
        </button>
      </div>
      <div className="editor-container">
        <CodeMirror
          value={value}
          height="100%"
          extensions={[javascript()]}
          onChange={onChange}
          theme="dark"
          className="code-editor"
        />
      </div>
    </div>
  );
}
