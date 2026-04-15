/**
 * Tests for SectionWrapper -- hover-reveal add button and section visibility toggle.
 *
 * Covers: D-01 (add button), D-02 (contextual label), D-05 (toggle), D-06 (hidden label).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionWrapper } from '../features/direct-edit/components/SectionWrapper';

describe('SectionWrapper', () => {
  const mockDragHandlers = {
    onGripMouseDown: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnter: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onDragEnd: vi.fn(),
  };

  const defaultProps = {
    sectionKey: 'work',
    title: 'Experience',
    isHidden: false,
    isEmpty: false,
    onToggleVisibility: vi.fn(),
    onAddEntry: vi.fn(),
    addLabel: '+ Add work entry',
    sectionIndex: 0,
    dragHandlers: mockDragHandlers,
  };

  it('renders children and section header text when not hidden', () => {
    render(
      <SectionWrapper {...defaultProps}>
        <div data-testid="child">Content</div>
      </SectionWrapper>
    );

    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('add button is present in DOM with correct label text', () => {
    render(
      <SectionWrapper {...defaultProps}>
        <div>Content</div>
      </SectionWrapper>
    );

    const addBtn = screen.getByText('+ Add work entry');
    expect(addBtn).toBeInTheDocument();
    expect(addBtn.tagName).toBe('BUTTON');
  });

  it('clicking add button calls onAddEntry', () => {
    const onAddEntry = vi.fn();

    render(
      <SectionWrapper {...defaultProps} onAddEntry={onAddEntry}>
        <div>Content</div>
      </SectionWrapper>
    );

    fireEvent.click(screen.getByText('+ Add work entry'));
    expect(onAddEntry).toHaveBeenCalledTimes(1);
  });

  it('clicking toggle calls onToggleVisibility', () => {
    const onToggle = vi.fn();

    render(
      <SectionWrapper {...defaultProps} onToggleVisibility={onToggle}>
        <div>Content</div>
      </SectionWrapper>
    );

    const toggleBtn = screen.getByLabelText('Hide Experience');
    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('when isHidden=true, renders hidden label and does not render children', () => {
    render(
      <SectionWrapper {...defaultProps} isHidden={true}>
        <div data-testid="child">Content</div>
      </SectionWrapper>
    );

    expect(screen.getByText('Experience (hidden)')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.queryByText('+ Add work entry')).not.toBeInTheDocument();
  });

  it('when isHidden=true, toggle button shows "Show" label for toggling back', () => {
    const onToggle = vi.fn();

    render(
      <SectionWrapper {...defaultProps} isHidden={true} onToggleVisibility={onToggle}>
        <div>Content</div>
      </SectionWrapper>
    );

    const toggleBtn = screen.getByLabelText('Show Experience');
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('sets data-section attribute on root element', () => {
    const { container } = render(
      <SectionWrapper {...defaultProps}>
        <div>Content</div>
      </SectionWrapper>
    );

    const wrapper = container.querySelector('[data-section="work"]');
    expect(wrapper).toBeInTheDocument();
  });

  it('uses renderHeader when provided instead of default header', () => {
    render(
      <SectionWrapper
        {...defaultProps}
        renderHeader={() => <div data-testid="custom-header">Custom</div>}
      >
        <div>Content</div>
      </SectionWrapper>
    );

    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  it('clicking remove button applies sectionConfirming class to wrapper', () => {
    const { container } = render(
      <SectionWrapper {...defaultProps} onRemoveSection={vi.fn()}>
        <div>Content</div>
      </SectionWrapper>
    );

    const wrapper = container.querySelector('[data-section="work"]');
    expect(wrapper).toBeInTheDocument();
    // Before clicking, sectionConfirming should not be present
    expect(wrapper!.className).not.toMatch(/sectionConfirming/);

    const removeBtn = screen.getByTitle('Remove section');
    fireEvent.click(removeBtn);

    // After clicking, sectionConfirming class should be applied
    expect(wrapper!.className).toMatch(/sectionConfirming/);
  });

  it('section confirm dialog uses noBackdrop (no dimming backdrop)', () => {
    const { container } = render(
      <SectionWrapper {...defaultProps} onRemoveSection={vi.fn()}>
        <div>Content</div>
      </SectionWrapper>
    );

    const removeBtn = screen.getByTitle('Remove section');
    fireEvent.click(removeBtn);

    // Confirm dialog should be present
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    // Should have the transparent backdrop (noBackdrop mode), not the dimming one.
    // CSS modules mangle class names, so check for the substring pattern.
    const allDivs = container.querySelectorAll('div');
    const hasTransparentBackdrop = Array.from(allDivs).some(
      (div) => div.className.includes('backdropTransparent')
    );
    const hasDimmingBackdrop = Array.from(allDivs).some(
      (div) => div.className.includes('backdrop') && !div.className.includes('backdropTransparent')
    );
    expect(hasTransparentBackdrop).toBe(true);
    expect(hasDimmingBackdrop).toBe(false);
  });
});
