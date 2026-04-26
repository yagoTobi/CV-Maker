/**
 * AddLinkDropdown -- preset link type picker shown on + click in the infoBar.
 * User picks a type; parent appends a link with pre-filled label + url placeholder.
 */
import { useEffect, useRef } from 'react';
import styles from './AddLinkDropdown.module.css';

export interface LinkPreset {
  label: string;
  url: string;
  icon: string;
}

const PRESETS: LinkPreset[] = [
  { label: 'LinkedIn',         url: 'https://linkedin.com/in/',     icon: 'in' },
  { label: 'GitHub',           url: 'https://github.com/',          icon: '</>' },
  { label: 'Portfolio',        url: 'https://yourname.com',         icon: '🌐' },
  { label: 'Google Scholar',   url: 'https://scholar.google.com/citations?user=', icon: '📚' },
  { label: 'Custom',           url: 'https://',                     icon: '🔗' },
];

interface AddLinkDropdownProps {
  onSelect: (preset: LinkPreset) => void;
  onClose: () => void;
}

export function AddLinkDropdown({ onSelect, onClose }: AddLinkDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className={styles.dropdown}>
      {PRESETS.map(p => (
        <button
          key={p.label}
          type="button"
          className={styles.option}
          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onSelect(p); }}
        >
          <span className={styles.optionIcon}>{p.icon}</span>
          {p.label}
        </button>
      ))}
    </div>
  );
}
