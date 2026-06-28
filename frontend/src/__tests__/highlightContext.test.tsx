import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EditableField } from '../features/direct-edit/components/editor-primitives/EditableField';
import type { HighlightSpan } from '../features/direct-edit/components/editor-primitives/EditableField';
import { HighlightContext } from '../features/direct-edit/components/editor-primitives/HighlightContext';
import type { HighlightContextValue } from '../features/direct-edit/components/editor-primitives/HighlightContext';

function span(changeId: string): HighlightSpan {
  return { changeId, severity: 'strong', isActive: true, startOffset: 0, endOffset: 9999 };
}

describe('EditableField + HighlightContext', () => {
  it('injects a highlight span pulled from context by fieldPath (when blurred)', () => {
    const ctx: HighlightContextValue = {
      getSpansFor: (fp) => (fp === 'personalInfo.summary' ? [span('c1')] : undefined),
    };
    const { container } = render(
      <HighlightContext.Provider value={ctx}>
        <EditableField value="Hello world" fieldPath="personalInfo.summary" onFieldChange={() => {}} />
      </HighlightContext.Provider>,
    );
    const hl = container.querySelector('[data-change-id="c1"]');
    expect(hl).not.toBeNull();
    expect(hl?.getAttribute('data-severity')).toBe('strong');
  });

  it('injects nothing for a field the context has no change for', () => {
    const ctx: HighlightContextValue = { getSpansFor: () => undefined };
    const { container } = render(
      <HighlightContext.Provider value={ctx}>
        <EditableField value="No highlight here" fieldPath="personalInfo.email" onFieldChange={() => {}} />
      </HighlightContext.Provider>,
    );
    expect(container.querySelector('[data-change-id]')).toBeNull();
  });

  it('without a provider, behaves as a normal field (no spans injected)', () => {
    const { container } = render(
      <EditableField value="Plain text" fieldPath="personalInfo.email" onFieldChange={() => {}} />,
    );
    expect(container.querySelector('[data-change-id]')).toBeNull();
  });

  it('wraps RICH field content in a highlight span (rich whole-field)', () => {
    const ctx: HighlightContextValue = {
      getSpansFor: (fp) => (fp === 'workExperience[0].bullets[0]' ? [span('c9')] : undefined),
    };
    const { container } = render(
      <HighlightContext.Provider value={ctx}>
        <EditableField
          value="<b>Built</b> X"
          fieldPath="workExperience[0].bullets[0]"
          onFieldChange={() => {}}
          rich
        />
      </HighlightContext.Provider>,
    );
    const hl = container.querySelector('[data-change-id="c9"]');
    expect(hl).not.toBeNull();
    expect(hl?.innerHTML).toContain('<b>Built</b>');
  });
});
