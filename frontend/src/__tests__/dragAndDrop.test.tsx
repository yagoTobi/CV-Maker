/**
 * Tests for drag-and-drop functionality -- hooks, component integration, and
 * full drag sequences.
 *
 * Covers: DND-01 (section drag), DND-02 (entry drag), DND-03 (reorder callbacks),
 * DND-04 (grip vs editable text separation).
 *
 * Section 1: useSectionDrag hook state transitions
 * Section 2: useEntryDrag hook state transitions
 * Section 3: SectionWrapper component with drag props
 * Section 4: EntryWrapper component with drag props
 * Section 5: Integration sequences (full drag cycles)
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { useSectionDrag } from '../features/direct-edit/hooks/useSectionDrag';
import { useEntryDrag } from '../features/direct-edit/hooks/useEntryDrag';
import { SectionWrapper } from '../features/direct-edit/components/SectionWrapper';
import { EntryWrapper } from '../features/direct-edit/components/EntryWrapper';

// --- Helpers ---

/** Create a minimal mock DragEvent with the fields our hooks access */
const mockDragEvent = (overrides: Record<string, unknown> = {}) => {
  const div = document.createElement('div');
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: div,
    dataTransfer: { setDragImage: vi.fn(), effectAllowed: '' },
    ...overrides,
  } as unknown as React.DragEvent;
};

/** Create a minimal mock MouseEvent for grip onMouseDown */
const mockMouseEvent = (targetEl?: HTMLElement) => {
  const el = targetEl ?? document.createElement('div');
  return {
    currentTarget: { closest: vi.fn(() => el) },
  } as unknown as React.MouseEvent;
};

/** Mock drag handlers for SectionWrapper / EntryWrapper props */
const createMockDragHandlers = () => ({
  onGripMouseDown: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnter: vi.fn(),
  onDragOver: vi.fn(),
  onDrop: vi.fn(),
  onDragEnd: vi.fn(),
});

// ===================================================================
// Section 1: useSectionDrag hook tests
// ===================================================================

describe('useSectionDrag', () => {
  it('returns all expected handler functions and state values', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useSectionDrag(onReorder));

    expect(typeof result.current.onGripMouseDown).toBe('function');
    expect(typeof result.current.onDragStart).toBe('function');
    expect(typeof result.current.onDragEnter).toBe('function');
    expect(typeof result.current.onDragOver).toBe('function');
    expect(typeof result.current.onDrop).toBe('function');
    expect(typeof result.current.onDragEnd).toBe('function');
    expect(result.current.dropIndex).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragFromIndex).toBeNull();
  });

  it('onDragStart sets isDragging=true and dragFromIndex to provided index', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useSectionDrag(onReorder));

    act(() => {
      result.current.onDragStart(mockDragEvent(), 2);
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.dragFromIndex).toBe(2);
  });

  it('onDragEnter sets dropIndex when dragFrom is active and target differs', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useSectionDrag(onReorder));

    act(() => {
      result.current.onDragStart(mockDragEvent(), 2);
    });
    act(() => {
      result.current.onDragEnter(mockDragEvent(), 4);
    });

    expect(result.current.dropIndex).toBe(4);
  });

  it('onDragEnter does NOT update dropIndex when target is same as dragFrom', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useSectionDrag(onReorder));

    act(() => {
      result.current.onDragStart(mockDragEvent(), 2);
    });
    act(() => {
      result.current.onDragEnter(mockDragEvent(), 2);
    });

    expect(result.current.dropIndex).toBeNull();
  });

  it('onDragEnd calls onReorder(from, to) and resets all state', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useSectionDrag(onReorder));

    act(() => {
      result.current.onDragStart(mockDragEvent(), 2);
    });
    act(() => {
      result.current.onDragEnter(mockDragEvent(), 4);
    });
    act(() => {
      result.current.onDragEnd(mockDragEvent());
    });

    expect(onReorder).toHaveBeenCalledWith(2, 4);
    expect(result.current.dropIndex).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragFromIndex).toBeNull();
  });

  it('onDragEnd resets all state to initial values', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useSectionDrag(onReorder));

    act(() => {
      result.current.onDragStart(mockDragEvent(), 1);
    });
    act(() => {
      result.current.onDragEnter(mockDragEvent(), 3);
    });
    act(() => {
      result.current.onDragEnd(mockDragEvent());
    });

    expect(result.current.dropIndex).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragFromIndex).toBeNull();
  });

  it('all handlers call e.stopPropagation()', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useSectionDrag(onReorder));

    const events = {
      dragStart: mockDragEvent(),
      dragEnter: mockDragEvent(),
      dragOver: mockDragEvent(),
      drop: mockDragEvent(),
      dragEnd: mockDragEvent(),
    };

    act(() => {
      result.current.onDragStart(events.dragStart, 0);
      result.current.onDragEnter(events.dragEnter, 1);
      result.current.onDragOver(events.dragOver);
      result.current.onDrop(events.drop, 1);
      result.current.onDragEnd(events.dragEnd);
    });

    expect(events.dragStart.stopPropagation).toHaveBeenCalled();
    expect(events.dragEnter.stopPropagation).toHaveBeenCalled();
    expect(events.dragOver.stopPropagation).toHaveBeenCalled();
    expect(events.drop.stopPropagation).toHaveBeenCalled();
    expect(events.dragEnd.stopPropagation).toHaveBeenCalled();
  });

  it('onDragOver calls e.preventDefault() to allow drop', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useSectionDrag(onReorder));

    const event = mockDragEvent();
    act(() => {
      result.current.onDragOver(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
  });
});

// ===================================================================
// Section 2: useEntryDrag hook tests
// ===================================================================

describe('useEntryDrag', () => {
  it('returns all expected handler functions and state values', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useEntryDrag(onReorder));

    expect(typeof result.current.onGripMouseDown).toBe('function');
    expect(typeof result.current.onDragStart).toBe('function');
    expect(typeof result.current.onDragEnter).toBe('function');
    expect(typeof result.current.onDragOver).toBe('function');
    expect(typeof result.current.onDrop).toBe('function');
    expect(typeof result.current.onDragEnd).toBe('function');
    expect(result.current.dropIndex).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragFromIndex).toBeNull();
  });

  it('full drag sequence: dragStart -> dragEnter -> dragEnd calls onReorder', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useEntryDrag(onReorder));

    act(() => {
      result.current.onDragStart(mockDragEvent(), 0);
    });
    act(() => {
      result.current.onDragEnter(mockDragEvent(), 2);
    });
    act(() => {
      result.current.onDragEnd(mockDragEvent());
    });

    expect(onReorder).toHaveBeenCalledWith(0, 2);
    expect(result.current.dropIndex).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragFromIndex).toBeNull();
  });

  it('all handlers call e.stopPropagation() for entry isolation', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useEntryDrag(onReorder));

    const events = {
      dragStart: mockDragEvent(),
      dragEnter: mockDragEvent(),
      dragOver: mockDragEvent(),
      drop: mockDragEvent(),
      dragEnd: mockDragEvent(),
    };

    act(() => {
      result.current.onDragStart(events.dragStart, 0);
      result.current.onDragEnter(events.dragEnter, 1);
      result.current.onDragOver(events.dragOver);
      result.current.onDrop(events.drop, 1);
      result.current.onDragEnd(events.dragEnd);
    });

    expect(events.dragStart.stopPropagation).toHaveBeenCalled();
    expect(events.dragEnter.stopPropagation).toHaveBeenCalled();
    expect(events.dragOver.stopPropagation).toHaveBeenCalled();
    expect(events.drop.stopPropagation).toHaveBeenCalled();
    expect(events.dragEnd.stopPropagation).toHaveBeenCalled();
  });
});

// ===================================================================
// Section 3: SectionWrapper component tests with drag props
// ===================================================================

describe('SectionWrapper with drag props', () => {
  const defaultSectionProps = {
    sectionKey: 'work',
    title: 'Experience',
    isHidden: false,
    isEmpty: false,
    onToggleVisibility: vi.fn(),
    onAddEntry: vi.fn(),
    addLabel: '+ Add work entry',
    sectionIndex: 0,
    dragHandlers: createMockDragHandlers(),
  };

  it('renders grip button with correct aria-label containing section title', () => {
    render(
      <SectionWrapper {...defaultSectionProps}>
        <div>Content</div>
      </SectionWrapper>
    );

    expect(screen.getByLabelText('Drag to reorder Experience section')).toBeInTheDocument();
  });

  it('grip button is a direct child of element with data-drag-section (not inside header row)', () => {
    const { container } = render(
      <SectionWrapper {...defaultSectionProps}>
        <div>Content</div>
      </SectionWrapper>
    );

    const gripButton = screen.getByLabelText('Drag to reorder Experience section');
    const dragSectionEl = container.querySelector('[data-drag-section="work"]');

    // Grip button's parent is the data-drag-section element
    expect(gripButton.parentElement).toBe(dragSectionEl);
  });

  it('renders data-drag-section attribute with sectionKey value', () => {
    const { container } = render(
      <SectionWrapper {...defaultSectionProps}>
        <div>Content</div>
      </SectionWrapper>
    );

    const dragSection = container.querySelector('[data-drag-section="work"]');
    expect(dragSection).toBeInTheDocument();
  });

  it('applies dragging class when isDragSource=true', () => {
    const { container } = render(
      <SectionWrapper {...defaultSectionProps} isDragSource={true}>
        <div>Content</div>
      </SectionWrapper>
    );

    const root = container.querySelector('[data-drag-section="work"]') as HTMLElement;
    expect(root.className).toContain('dragging');
  });

  it('does NOT apply dragging class when isDragSource=false', () => {
    const { container } = render(
      <SectionWrapper {...defaultSectionProps} isDragSource={false}>
        <div>Content</div>
      </SectionWrapper>
    );

    const root = container.querySelector('[data-drag-section="work"]') as HTMLElement;
    expect(root.className).not.toContain('dragging');
  });

  it('clicking grip button calls dragHandlers.onGripMouseDown', () => {
    const handlers = createMockDragHandlers();
    render(
      <SectionWrapper {...defaultSectionProps} dragHandlers={handlers}>
        <div>Content</div>
      </SectionWrapper>
    );

    fireEvent.mouseDown(screen.getByLabelText('Drag to reorder Experience section'));
    expect(handlers.onGripMouseDown).toHaveBeenCalledTimes(1);
  });
});

// ===================================================================
// Section 4: EntryWrapper component tests with drag props
// ===================================================================

describe('EntryWrapper with drag props', () => {
  it('renders grip button when showGrip=true', () => {
    render(
      <EntryWrapper
        onDelete={vi.fn()}
        showGrip={true}
        entryIndex={0}
        dragHandlers={createMockDragHandlers()}
      >
        <div>Content</div>
      </EntryWrapper>
    );

    expect(screen.getByLabelText('Drag to reorder')).toBeInTheDocument();
  });

  it('does NOT render grip button when showGrip=false', () => {
    render(
      <EntryWrapper
        onDelete={vi.fn()}
        showGrip={false}
        entryIndex={0}
        dragHandlers={createMockDragHandlers()}
      >
        <div>Content</div>
      </EntryWrapper>
    );

    expect(screen.queryByLabelText('Drag to reorder')).not.toBeInTheDocument();
  });

  it('renders DropLine when showDropLine=true', () => {
    const { container } = render(
      <EntryWrapper
        onDelete={vi.fn()}
        showDropLine={true}
        entryIndex={0}
      >
        <div>Content</div>
      </EntryWrapper>
    );

    // DropLine renders an aria-hidden="true" div
    const dropLine = container.querySelector('[aria-hidden="true"]');
    expect(dropLine).toBeInTheDocument();
  });

  it('does NOT render DropLine when showDropLine=false', () => {
    const { container } = render(
      <EntryWrapper
        onDelete={vi.fn()}
        showDropLine={false}
        entryIndex={0}
      >
        <div>Content</div>
      </EntryWrapper>
    );

    const dropLine = container.querySelector('[aria-hidden="true"]');
    expect(dropLine).not.toBeInTheDocument();
  });

  it('renders data-drag-entry attribute with entryIndex value', () => {
    const { container } = render(
      <EntryWrapper
        onDelete={vi.fn()}
        entryIndex={3}
        dragHandlers={createMockDragHandlers()}
      >
        <div>Content</div>
      </EntryWrapper>
    );

    const entryEl = container.querySelector('[data-drag-entry="3"]');
    expect(entryEl).toBeInTheDocument();
  });

  it('applies dragging class when isDragSource=true', () => {
    const { container } = render(
      <EntryWrapper
        onDelete={vi.fn()}
        entryIndex={0}
        isDragSource={true}
        dragHandlers={createMockDragHandlers()}
      >
        <div>Content</div>
      </EntryWrapper>
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('dragging');
  });

  it('does NOT apply dragging class when isDragSource=false', () => {
    const { container } = render(
      <EntryWrapper
        onDelete={vi.fn()}
        entryIndex={0}
        isDragSource={false}
        dragHandlers={createMockDragHandlers()}
      >
        <div>Content</div>
      </EntryWrapper>
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('dragging');
  });

  it('existing delete functionality still works with new drag props', () => {
    const onDelete = vi.fn();
    render(
      <EntryWrapper
        onDelete={onDelete}
        entryIndex={0}
        dragHandlers={createMockDragHandlers()}
        showGrip={true}
      >
        <div>Content</div>
      </EntryWrapper>
    );

    fireEvent.click(screen.getByLabelText('Delete entry'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

// ===================================================================
// Section 5: Integration sequence tests (full drag cycles)
// ===================================================================

describe('integration: full drag sequences', () => {
  it('useSectionDrag: start(1) -> enter(3) -> drop(3) calls onReorder(1, 3) and resets', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useSectionDrag(onReorder));

    act(() => {
      result.current.onDragStart(mockDragEvent(), 1);
    });
    expect(result.current.isDragging).toBe(true);
    expect(result.current.dragFromIndex).toBe(1);

    act(() => {
      result.current.onDragEnter(mockDragEvent(), 3);
    });
    expect(result.current.dropIndex).toBe(3);

    act(() => {
      result.current.onDragEnd(mockDragEvent());
    });
    expect(onReorder).toHaveBeenCalledWith(1, 3);
    expect(result.current.dropIndex).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragFromIndex).toBeNull();
  });

  it('useEntryDrag: start(0) -> enter(2) -> dragEnd calls onReorder(0, 2) and resets', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useEntryDrag(onReorder));

    act(() => {
      result.current.onDragStart(mockDragEvent(), 0);
    });
    expect(result.current.isDragging).toBe(true);
    expect(result.current.dragFromIndex).toBe(0);

    act(() => {
      result.current.onDragEnter(mockDragEvent(), 2);
    });
    expect(result.current.dropIndex).toBe(2);

    act(() => {
      result.current.onDragEnd(mockDragEvent());
    });
    expect(onReorder).toHaveBeenCalledWith(0, 2);
    expect(result.current.dropIndex).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragFromIndex).toBeNull();
  });

  it('cancelled drag: start(1) -> dragEnd (no drop) does NOT call onReorder', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useSectionDrag(onReorder));

    act(() => {
      result.current.onDragStart(mockDragEvent(), 1);
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.onDragEnd(mockDragEvent());
    });

    expect(onReorder).not.toHaveBeenCalled();
    expect(result.current.dropIndex).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragFromIndex).toBeNull();
  });
});
