/**
 * LinkHeaderItem -- Renders a single link in the CV header infoBar.
 *
 * Label is an EditableField. URL is editable via a hover popover.
 * Backspace on empty label removes the link. Blue text indicates a URL is set.
 */
import { useCallback } from 'react';
import { EditableField } from './EditableField';
import styles from './LinkHeaderItem.module.css';

interface LinkHeaderItemProps {
  linkId: string;
  label: string;
  url: string;
  linkIdx: number;
  onFieldChange: (path: string, value: string) => void;
  onRemoveLink: (idx: number) => void;
  onInput?: () => void;
  readOnly?: boolean;
  className?: string;
}

function inferUrlPlaceholder(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('linkedin')) return 'https://linkedin.com/in/username';
  if (l.includes('github')) return 'https://github.com/username';
  if (l.includes('scholar')) return 'https://scholar.google.com/citations?user=...';
  if (l.includes('portfolio') || l.includes('website') || l.includes('personal')) return 'https://yourname.com';
  return 'https://';
}

export function LinkHeaderItem({
  label,
  url,
  linkIdx,
  onFieldChange,
  onRemoveLink,
  onInput,
  readOnly,
  className,
}: LinkHeaderItemProps) {
  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFieldChange(`personalInfo.links[${linkIdx}].url`, e.target.value);
    onInput?.();
  }, [linkIdx, onFieldChange, onInput]);

  // Backspace on empty label removes the link.
  // Read live DOM content instead of stale label prop (EditableField commits on blur, not on input).
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const liveText = (e.currentTarget as HTMLElement).textContent ?? '';
      if (liveText === '') {
        e.preventDefault();
        onRemoveLink(linkIdx);
      }
    }
  }, [linkIdx, onRemoveLink]);

  const placeholder = inferUrlPlaceholder(label);
  // Show link color only when URL is set (matches LaTeX darkblue behavior)
  const labelClassName = [className, url ? styles.hasUrl : ''].filter(Boolean).join(' ');

  return (
    <span className={styles.wrapper}>
      {!readOnly && (
        <span className={styles.urlTrigger}>
          <span className={styles.urlPopover}>
            <span className={styles.urlIcon}>↗</span>
            <input
              className={styles.urlInput}
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder={placeholder}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            />
          </span>
        </span>
      )}
      <EditableField
        value={label}
        fieldPath={`personalInfo.links[${linkIdx}].label`}
        onFieldChange={onFieldChange}
        placeholder="Link label"
        className={labelClassName}
        onInput={onInput}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
      />
    </span>
  );
}
