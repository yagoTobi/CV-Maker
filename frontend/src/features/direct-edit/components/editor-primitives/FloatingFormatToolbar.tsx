/**
 * FloatingFormatToolbar -- Floating mini-toolbar for rich text formatting.
 * Appears above text selection when inside a [data-rich] contentEditable element.
 * Provides Bold, Italic, and Link buttons via document.execCommand.
 *
 * Three modes:
 * - format:      B | I | 🔗  (text selected)
 * - link-create: [URL input] [submit]  (creating new link from selection)
 * - link-edit:   [URL input] [submit] [unlink]  (cursor inside existing link)
 *
 * Keyboard shortcuts (Cmd/Ctrl+B, Cmd/Ctrl+I, Cmd/Ctrl+K) work in any [data-rich] field.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './FloatingFormatToolbar.module.css';

type Mode = 'format' | 'link-create' | 'link-edit';

export function FloatingFormatToolbar() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [formats, setFormats] = useState({ bold: false, italic: false, linked: false });
  const [mode, setMode] = useState<Mode>('format');
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const linkAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<Mode>('format');

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setMode('format');
    setLinkUrl('');
    linkAnchorRef.current = null;
  }, []);

  const positionToolbar = useCallback((rect: DOMRect) => {
    const TOOLBAR_W = 118;
    let left = rect.left + rect.width / 2 - TOOLBAR_W / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - TOOLBAR_W - 8));
    setPos({ top: rect.top - 44, left });
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      clearTimeout(hideTimerRef.current);
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        if (modeRef.current === 'format') {
          hideTimerRef.current = setTimeout(dismiss, 150);
        }
        return;
      }

      const range = sel.getRangeAt(0);
      const ancestor = range.commonAncestorContainer;
      const el = ancestor instanceof Element ? ancestor : ancestor.parentElement;

      if (!el?.closest('[data-rich]')) {
        if (modeRef.current === 'format') {
          hideTimerRef.current = setTimeout(dismiss, 150);
        }
        return;
      }

      const anchorEl = el.closest('[data-rich] a') as HTMLAnchorElement | null;

      if (sel.isCollapsed) {
        if (anchorEl) {
          const rect = anchorEl.getBoundingClientRect();
          positionToolbar(rect);
          linkAnchorRef.current = anchorEl;
          savedRangeRef.current = range.cloneRange();
          setLinkUrl(anchorEl.getAttribute('href') ?? '');
          setMode('link-edit');
          setVisible(true);
          setTimeout(() => linkInputRef.current?.focus(), 0);
        } else if (modeRef.current === 'format') {
          hideTimerRef.current = setTimeout(dismiss, 150);
        }
        return;
      }

      // Non-collapsed selection: show format buttons
      if (modeRef.current !== 'link-create') {
        const rect = range.getBoundingClientRect();
        if (rect.width === 0) return;
        positionToolbar(rect);
        setFormats({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          linked: !!anchorEl,
        });
        setMode('format');
        setVisible(true);
      }
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
        setMode('link-create');
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
  }, [dismiss, positionToolbar]);

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
    setMode('link-create');
    setLinkUrl('');
    setTimeout(() => linkInputRef.current?.focus(), 0);
  }, [formats.linked]);

  const applyLink = useCallback((url: string) => {
    let href = url.trim();
    if (!href) return;
    if (!/^https?:\/\/|^mailto:/.test(href)) href = `https://${href}`;

    if (mode === 'link-edit' && linkAnchorRef.current) {
      linkAnchorRef.current.href = href;
    } else {
      if (savedRangeRef.current) {
        const sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(savedRangeRef.current); }
      }
      document.execCommand('createLink', false, href);
      document.querySelectorAll('[data-rich] a:not([data-editor-link])').forEach(a => {
        a.setAttribute('data-editor-link', 'true');
      });
    }
  }, [mode]);

  const handleLinkSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    applyLink(linkUrl);
    dismiss();
  }, [linkUrl, applyLink, dismiss]);

  const handleUnlink = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (linkAnchorRef.current) {
      const anchor = linkAnchorRef.current;
      const parent = anchor.parentNode;
      if (parent) {
        while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
        parent.removeChild(anchor);
      }
    }
    dismiss();
  }, [dismiss]);

  const handleLinkInputBlur = useCallback((e: React.FocusEvent) => {
    // Don't dismiss if focus moved to another element within the toolbar
    if (toolbarRef.current?.contains(e.relatedTarget as Node)) return;
    setTimeout(() => {
      if (!toolbarRef.current?.contains(document.activeElement)) {
        dismiss();
      }
    }, 150);
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      className={styles.toolbar}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault(); }}
    >
      {mode === 'format' ? (
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
      ) : (
        <form onSubmit={handleLinkSubmit} className={styles.linkForm}>
          <input
            ref={linkInputRef}
            className={styles.linkInput}
            type="text"
            placeholder="https://"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') dismiss(); }}
            onBlur={handleLinkInputBlur}
            autoComplete="off"
          />
          <button type="submit" className={styles.linkSubmitBtn} title="Apply link">&#8629;</button>
          {mode === 'link-edit' && (
            <button type="button" className={styles.unlinkBtn} onMouseDown={handleUnlink} title="Remove link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71"/>
                <line x1="2" y1="2" x2="22" y2="22"/>
              </svg>
            </button>
          )}
        </form>
      )}
    </div>
  );
}
