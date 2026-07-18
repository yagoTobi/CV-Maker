import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppCard from '../features/dashboard/AppCard';
import type { CVVersionMeta, CVVersionWithChildren } from '../types';

const app: CVVersionMeta = {
  id: 'app-1',
  name: 'Acme Staff Engineer',
  templateId: 'med-length-proff-cv',
  companyName: 'Acme',
  role: 'Staff Engineer',
  parentVersionId: null,
  createdAt: '2026-07-01T00:00:00.000Z',
};

const baseCvs: CVVersionWithChildren[] = [
  {
    id: 'base-1',
    name: 'Base CV',
    templateId: 'med-length-proff-cv',
    parentVersionId: null,
    createdAt: '2026-07-03T00:00:00.000Z',
    children: [],
  },
];

function renderAppCard(parentId: string | null) {
  return render(
    <AppCard
      app={app}
      parentId={parentId}
      baseCvs={baseCvs}
      loadingId={null}
      downloadingId={null}
      deletingId={null}
      moveDropdownId={null}
      confirmDeleteId={null}
      onOpen={vi.fn()}
      onDownload={vi.fn()}
      onRequestDelete={vi.fn()}
      onConfirmDelete={vi.fn()}
      onCancelDelete={vi.fn()}
      onMove={vi.fn()}
      onSetMoveDropdown={vi.fn()}
      moveDropdownRef={createRef<HTMLDivElement>()}
    />,
  );
}

describe('AppCard Move visibility', () => {
  it('shows Move when rendered as an ungrouped application card', () => {
    renderAppCard(null);

    expect(screen.getByRole('button', { name: 'Move to baseline' })).toBeInTheDocument();
  });

  it('hides Move when rendered as a grouped application card', () => {
    renderAppCard('base-1');

    expect(screen.queryByRole('button', { name: 'Move to baseline' })).not.toBeInTheDocument();
  });
});
