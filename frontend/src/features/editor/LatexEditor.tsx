import CodeMirror from '@uiw/react-codemirror';
import { latex } from 'codemirror-lang-latex';
import styles from './LatexEditor.module.css';

interface LatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCompile: () => void;
  isCompiling: boolean;
  hasUnsavedChanges?: boolean;
}

export function LatexEditor({ value, onChange, onCompile, isCompiling, hasUnsavedChanges }: LatexEditorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          onClick={onCompile}
          disabled={isCompiling}
          className={`${styles.compileBtn} ${hasUnsavedChanges ? styles.hasChanges : ''}`}
        >
          {hasUnsavedChanges && <span className={styles.pulseIndicator}></span>}
          {isCompiling ? 'Compiling...' : 'Compile PDF'}
        </button>
      </div>
      <div className={styles.editorContainer}>
        <CodeMirror
          value={value}
          height="100%"
          extensions={[latex()]}
          onChange={onChange}
          theme="dark"
          className={styles.codeEditor}
        />
      </div>
    </div>
  );
}
