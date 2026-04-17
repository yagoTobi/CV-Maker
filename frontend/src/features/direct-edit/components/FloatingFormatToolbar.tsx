/**
 * FloatingFormatToolbar -- Floating mini-toolbar for rich text formatting.
 * Appears above text selection when inside a [data-rich] contentEditable element.
 * Provides Bold, Italic, and Link buttons via document.execCommand.
 *
 * Keyboard shortcuts (Cmd/Ctrl+B, Cmd/Ctrl+I, Cmd/Ctrl+K) are handled here so they
 * work regardless of which [data-rich] element is focused.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './FloatingFormatToolbar.module.css';

export function FloatingFormatToolbar() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [formats, setFormats] = useState({ bold: false, italic: false, linked: false });
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** Ref mirror of showLink so event listeners always read the latest value */
  const showLinkRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    showLinkRef.current = showLink;
  }, [showLink]);

  useEffect(() => {
    const onSelectionChange = () => {
      clearTimeout(hideTimerRef.current);
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        // Do not hide while the link input is open — the user clicked the link
        // button which collapses the selection, but we must keep the toolbar visible.
        if (!showLinkRef.current) {
          hideTimerRef.current = setTimeout(() => { setVisible(false); setShowLink(false); }, 150);
        }
        return;
      }
      const range = sel.getRangeAt(0);
      const ancestor = range.commonAncestorContainer;
      const el = ancestor instanceof Element ? ancestor : ancestor.parentElement;
      if (!el?.closest('[data-rich]')) {
        if (!showLinkRef.current) {
          hideTimerRef.current = setTimeout(() => { setVisible(false); setShowLink(false); }, 150);
        }
        return;
      }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0) return;
      const TOOLBAR_W = 118;
      let left = rect.left + rect.width / 2 - TOOLBAR_W / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - TOOLBAR_W - 8));
      setPos({ top: rect.top - 44, left });
      setFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        linked: !!el.closest('[data-rich] a'),
      });
      setVisible(true);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-rich]')) return;

      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        document.execCommand('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        document.execCommand('italic');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const sel = window.getSelection();
        if (sel?.rangeCount) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        setVisible(true);
        setShowLink(true);
        setLinkUrl('');
        setTimeout(() => linkInputRef.current?.focus(), 0);
      }
    };

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleBold = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand('bold');
  }, []);

  const handleItalic = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand('italic');
  }, []);

  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (formats.linked) { document.execCommand('unlink'); return; }
    const sel = window.getSelection();
    if (sel?.rangeCount) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    setShowLink(true);
    setLinkUrl('');
    setTimeout(() => linkInputRef.current?.focus(), 0);
  }, [formats.linked]);

  const handleLinkSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) { setShowLink(false); return; }
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(savedRangeRef.current); }
    }
    let url = linkUrl.trim();
    if (!/^https?:\/\/|^mailto:/.test(url)) url = `https://${url}`;
    document.execCommand('createLink', false, url);
    // Disable navigation on editor links
    document.querySelectorAll('[data-rich] a:not([data-editor-link])').forEach(a => {
      a.setAttribute('data-editor-link', 'true');
      (a as HTMLElement).style.pointerEvents = 'none';
      (a as HTMLElement).style.cursor = 'text';
    });
    setShowLink(false);
    setLinkUrl('');
  }, [linkUrl]);

  if (!visible) return null;

  return (
    <div
      className={styles.toolbar}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {showLink ? (
        <form onSubmit={handleLinkSubmit} className={styles.linkForm}>
          <input
            ref={linkInputRef}
            className={styles.linkInput}
            type="text"
            placeholder="https://"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setShowLink(false)}
            autoComplete="off"
          />
          <button type="submit" className={styles.linkSubmitBtn}>&#8629;</button>
        </form>
      ) : (
        <>
          <button
            type="button"
            className={`${styles.btn}${formats.bold ? ` ${styles.active}` : ''}`}
            onMouseDown={handleBold}
            title="Bold (Cmd+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={`${styles.btn}${formats.italic ? ` ${styles.active}` : ''}`}
            onMouseDown={handleItalic}
            title="Italic (Cmd+I)"
          >
            <em>I</em>
          </button>
          <span className={styles.sep} />
          <button
            type="button"
            className={`${styles.btn}${formats.linked ? ` ${styles.active}` : ''}`}
            onMouseDown={handleLinkClick}
            title={formats.linked ? 'Remove link' : 'Add link (Cmd+K)'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
