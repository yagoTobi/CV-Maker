/**
 * Tests for EditableBulletList component -- bullet list with
 * Enter/Backspace keyboard handling for natural editing.
 *
 * Covers: EDIT-03 (Enter creates bullet, Backspace deletes empty bullet).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EditableBulletList } from '../features/direct-edit/components/editor-primitives/EditableBulletList';
import { SectionAssistContext } from '../features/direct-edit/components/editor-primitives/SectionAssistContext';
import type { BulletItem, TailorChange } from '../types';
import type { SectionAssistContextValue } from '../features/direct-edit/components/editor-primitives/SectionAssistContext';

describe('EditableBulletList', () => {
  const defaultBullets: BulletItem[] = [
    { id: 'b1', text: 'Built feature X' },
    { id: 'b2', text: 'Led team Y' },
    { id: 'b3', text: 'Managed project Z' },
  ];

  const defaultProps = {
    bullets: defaultBullets,
    basePath: 'workExperience[0].bullets',
    onBulletChange: vi.fn(),
    onBulletAdd: vi.fn(),
    onBulletRemove: vi.fn(),
  };

  it('renders one EditableField per bullet in the bullets array', () => {
    const { container } = render(<EditableBulletList {...defaultProps} />);
    const editableFields = container.querySelectorAll('[contenteditable]');
    expect(editableFields.length).toBe(3);
  });

  it('each bullet has a middle-dot marker (::before with \\00B7)', () => {
    const { container } = render(<EditableBulletList {...defaultProps} />);
    const markers = container.querySelectorAll('.bulletMarker');
    expect(markers.length).toBe(3);
  });

  it('on Enter keydown: calls onBulletAdd(index) to create new bullet after current', () => {
    const onBulletAdd = vi.fn();
    const onBulletChange = vi.fn();
    const { container } = render(
      <EditableBulletList
        {...defaultProps}
        onBulletAdd={onBulletAdd}
        onBulletChange={onBulletChange}
      />
    );
    const editableFields = container.querySelectorAll('[contenteditable]');
    const firstBullet = editableFields[0] as HTMLElement;

    fireEvent.keyDown(firstBullet, { key: 'Enter' });

    expect(onBulletAdd).toHaveBeenCalledWith(0);
  });

  it('on Backspace keydown with empty text: calls onBulletRemove(index) if bullets.length > 1', () => {
    const onBulletRemove = vi.fn();
    const bullets: BulletItem[] = [
      { id: 'b1', text: '' },
      { id: 'b2', text: 'Some text' },
    ];
    const { container } = render(
      <EditableBulletList
        {...defaultProps}
        bullets={bullets}
        onBulletRemove={onBulletRemove}
      />
    );
    const editableFields = container.querySelectorAll('[contenteditable]');
    const firstBullet = editableFields[0] as HTMLElement;

    // Ensure the element has empty text
    firstBullet.textContent = '';
    fireEvent.keyDown(firstBullet, { key: 'Backspace' });

    expect(onBulletRemove).toHaveBeenCalledWith(0);
  });

  it('on Backspace keydown with empty text and only 1 bullet: calls onBulletRemove', () => {
    const onBulletRemove = vi.fn();
    const bullets: BulletItem[] = [
      { id: 'b1', text: '' },
    ];
    const { container } = render(
      <EditableBulletList
        {...defaultProps}
        bullets={bullets}
        onBulletRemove={onBulletRemove}
      />
    );
    const editableFields = container.querySelectorAll('[contenteditable]');
    const firstBullet = editableFields[0] as HTMLElement;

    firstBullet.textContent = '';
    fireEvent.keyDown(firstBullet, { key: 'Backspace' });

    expect(onBulletRemove).toHaveBeenCalledWith(0);
  });

  it('passes onInput to each EditableField', () => {
    const onInput = vi.fn();
    const { container } = render(
      <EditableBulletList {...defaultProps} onInput={onInput} />
    );
    const editableFields = container.querySelectorAll('[contenteditable]');

    fireEvent.input(editableFields[0]);

    expect(onInput).toHaveBeenCalled();
  });

  it('renders a focusable starter row when there are no bullets', () => {
    const { container } = render(
      <EditableBulletList {...defaultProps} bullets={[]} />
    );

    const starter = container.querySelector('[data-field-path="workExperience[0].bullets[0]"]');
    const marker = container.querySelector('[data-empty-starter-marker]');
    expect(starter).not.toBeNull();
    expect(starter?.getAttribute('data-placeholder')).toBe('Add bullet...');
    expect(marker?.getAttribute('data-visible')).toBe('false');
  });

  it('shows the empty starter bullet marker as soon as the user types', () => {
    const { container } = render(
      <EditableBulletList {...defaultProps} bullets={[]} />
    );
    const starter = container.querySelector('[contenteditable]') as HTMLElement;
    const marker = container.querySelector('[data-empty-starter-marker]');

    starter.textContent = 'First bullet';
    fireEvent.input(starter);

    expect(marker?.getAttribute('data-visible')).toBe('true');
  });

  it('on Enter in empty starter: calls onBulletAdd(-1)', () => {
    const onBulletAdd = vi.fn();
    const { container } = render(
      <EditableBulletList
        {...defaultProps}
        bullets={[]}
        onBulletAdd={onBulletAdd}
      />
    );
    const starter = container.querySelector('[contenteditable]') as HTMLElement;

    fireEvent.keyDown(starter, { key: 'Enter' });

    expect(onBulletAdd).toHaveBeenCalledWith(-1);
  });

  it('commits typed starter text as the first bullet on blur', () => {
    const onBulletAdd = vi.fn();
    const onBulletChange = vi.fn();
    const { container } = render(
      <EditableBulletList
        {...defaultProps}
        bullets={[]}
        onBulletAdd={onBulletAdd}
        onBulletChange={onBulletChange}
      />
    );
    const starter = container.querySelector('[contenteditable]') as HTMLElement;

    starter.textContent = 'Built the first item';
    fireEvent.blur(starter);

    expect(onBulletAdd).toHaveBeenCalledWith(-1);
    expect(onBulletChange).toHaveBeenCalledWith(0, 'Built the first item');
  });

  it('renders with correct fieldPath for each bullet', () => {
    const { container } = render(<EditableBulletList {...defaultProps} />);
    const editableFields = container.querySelectorAll('[data-field-path]');

    expect(editableFields[0].getAttribute('data-field-path')).toBe('workExperience[0].bullets[0]');
    expect(editableFields[1].getAttribute('data-field-path')).toBe('workExperience[0].bullets[1]');
    expect(editableFields[2].getAttribute('data-field-path')).toBe('workExperience[0].bullets[2]');
  });

  describe('addChange ghost bullet (Phase 13 D-15)', () => {
    const addChange: TailorChange = {
      id: 'a1',
      fieldPath: 'workExperience[0].bullets',
      section: 'Work Experience',
      description: 'Add new bullet',
      currentValue: '',
      alternatives: [{ label: 'A', value: 'New bullet text' }],
      changeType: 'add',
    };

    it('renders an extra <li>-like row with contentEditable=false and data-change-id when addChange is set', () => {
      const { container } = render(
        <EditableBulletList {...defaultProps} addChange={addChange} />
      );
      const ghost = container.querySelector('[data-change-id="a1"]') as HTMLElement;
      expect(ghost).not.toBeNull();
      // jsdom reflects contentEditable as the attribute string 'false' in this code path.
      expect(ghost.getAttribute('contenteditable')).toBe('false');
    });

    it('the ghost bullet text content matches addChange.alternatives[0].value', () => {
      const { container } = render(
        <EditableBulletList {...defaultProps} addChange={addChange} />
      );
      const ghost = container.querySelector('[data-change-id="a1"]') as HTMLElement;
      // Text includes the marker '+' and the proposed text.
      expect(ghost.textContent).toContain('New bullet text');
    });

    it('real bullet count is unchanged when addChange is rendered (focus refs unaffected)', () => {
      const { container } = render(
        <EditableBulletList {...defaultProps} addChange={addChange} />
      );
      const editableFields = container.querySelectorAll('[contenteditable="plaintext-only"]');
      expect(editableFields.length).toBe(3); // same as default 3 bullets
    });

    it('ghost bullet rendered AFTER the last real bullet in DOM order', () => {
      const { container } = render(
        <EditableBulletList {...defaultProps} addChange={addChange} />
      );
      const realBullets = container.querySelectorAll('[contenteditable="plaintext-only"]');
      const ghost = container.querySelector('[data-change-id="a1"]') as HTMLElement;
      const lastReal = realBullets[realBullets.length - 1];
      // documentPosition: lastReal precedes ghost
      // Node.DOCUMENT_POSITION_FOLLOWING (4) means second arg follows first
      expect(lastReal.compareDocumentPosition(ghost) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('deleteChangeIdsByBulletId (Phase 13 D-15)', () => {
    it('flags the targeted bullet with a delete-tier highlight span', () => {
      const deleteMap = new Map<string, string>();
      deleteMap.set('b2', 'd1');

      const { container } = render(
        <EditableBulletList
          {...defaultProps}
          deleteChangeIdsByBulletId={deleteMap}
          activeChangeId={null}
        />
      );
      // The b2 bullet (index 1, "Led team Y") should now contain a span with delete tier.
      const span = container.querySelector('span[data-change-id="d1"]') as HTMLElement;
      expect(span).not.toBeNull();
      expect(span.getAttribute('data-severity')).toBe('delete');
      // Inline-text wrapping covers the whole bullet text.
      expect(span.textContent).toBe('Led team Y');
    });

    it('does not affect non-targeted bullets', () => {
      const deleteMap = new Map<string, string>();
      deleteMap.set('b2', 'd1');

      const { container } = render(
        <EditableBulletList {...defaultProps} deleteChangeIdsByBulletId={deleteMap} />
      );
      // No delete span on bullets b1 or b3
      const allDeleteSpans = container.querySelectorAll('span[data-severity="delete"]');
      expect(allDeleteSpans.length).toBe(1);
    });
  });

  // ── Space-on-empty-bullet assist trigger (T11) ──────────────────────────
  describe('Space-on-empty-bullet assist trigger', () => {
    function renderWithAssist(
      props: Partial<typeof defaultProps> & { bullets?: BulletItem[] } = {},
      requestAssist: SectionAssistContextValue['requestAssist'] = vi.fn(),
      suppressed = false,
    ) {
      return render(
        <SectionAssistContext.Provider value={{ requestAssist, suppressed }}>
          <EditableBulletList {...defaultProps} {...props} />
        </SectionAssistContext.Provider>,
      );
    }

    it('Space on an empty bullet calls requestAssist once', () => {
      const requestAssist = vi.fn();
      const { container } = renderWithAssist(
        { bullets: [{ id: 'b1', text: '' }] },
        requestAssist,
      );
      const el = container.querySelector('[contenteditable]') as HTMLElement;
      el.textContent = '';

      fireEvent.keyDown(el, { key: ' ' });

      expect(requestAssist).toHaveBeenCalledOnce();
      expect(requestAssist).toHaveBeenCalledWith(
        expect.objectContaining({
          basePath: 'workExperience[0].bullets',
          index: 0,
        }),
      );
    });

    it('Space on a non-empty bullet does NOT call requestAssist', () => {
      const requestAssist = vi.fn();
      const { container } = renderWithAssist(
        { bullets: [{ id: 'b1', text: 'some content' }] },
        requestAssist,
      );
      const el = container.querySelector('[contenteditable]') as HTMLElement;
      el.textContent = 'some content';

      fireEvent.keyDown(el, { key: ' ' });

      expect(requestAssist).not.toHaveBeenCalled();
    });

    it('Space during IME composition does NOT call requestAssist', () => {
      const requestAssist = vi.fn();
      const { container } = renderWithAssist(
        { bullets: [{ id: 'b1', text: '' }] },
        requestAssist,
      );
      const el = container.querySelector('[contenteditable]') as HTMLElement;
      el.textContent = '';

      fireEvent.keyDown(el, { key: ' ', isComposing: true });

      expect(requestAssist).not.toHaveBeenCalled();
    });

    it('Space while suppressed=true does NOT call requestAssist', () => {
      const requestAssist = vi.fn();
      const { container } = renderWithAssist(
        { bullets: [{ id: 'b1', text: '' }] },
        requestAssist,
        true, // suppressed
      );
      const el = container.querySelector('[contenteditable]') as HTMLElement;
      el.textContent = '';

      fireEvent.keyDown(el, { key: ' ' });

      expect(requestAssist).not.toHaveBeenCalled();
    });

    it('whitespace-only bullet is treated as empty → calls requestAssist', () => {
      const requestAssist = vi.fn();
      const { container } = renderWithAssist(
        { bullets: [{ id: 'b1', text: '' }] },
        requestAssist,
      );
      const el = container.querySelector('[contenteditable]') as HTMLElement;
      el.textContent = '   ';

      fireEvent.keyDown(el, { key: ' ' });

      expect(requestAssist).toHaveBeenCalledOnce();
    });

    it('Space on the empty-starter row (bullets.length===0) calls requestAssist with index 0', () => {
      const requestAssist = vi.fn();
      const { container } = renderWithAssist({ bullets: [] }, requestAssist);
      const el = container.querySelector('[contenteditable]') as HTMLElement;
      el.textContent = '';

      fireEvent.keyDown(el, { key: ' ' });

      expect(requestAssist).toHaveBeenCalledOnce();
      expect(requestAssist).toHaveBeenCalledWith(
        expect.objectContaining({ index: 0 }),
      );
    });

    it('Enter still creates a bullet after Space trigger is added', () => {
      const onBulletAdd = vi.fn();
      const { container } = renderWithAssist(
        { bullets: [{ id: 'b1', text: 'hello' }], onBulletAdd },
      );
      const el = container.querySelector('[contenteditable]') as HTMLElement;

      fireEvent.keyDown(el, { key: 'Enter' });

      expect(onBulletAdd).toHaveBeenCalledWith(0);
    });

    it('Backspace on empty still removes the bullet after Space trigger is added', () => {
      const onBulletRemove = vi.fn();
      const { container } = renderWithAssist(
        {
          bullets: [{ id: 'b1', text: '' }, { id: 'b2', text: 'ok' }],
          onBulletRemove,
        },
      );
      const els = container.querySelectorAll('[contenteditable]');
      const first = els[0] as HTMLElement;
      first.textContent = '';

      fireEvent.keyDown(first, { key: 'Backspace' });

      expect(onBulletRemove).toHaveBeenCalledWith(0);
    });
  });
});
