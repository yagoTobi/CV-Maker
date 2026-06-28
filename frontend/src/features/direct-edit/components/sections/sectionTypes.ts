import type { SkillItem } from '../../../../types';
import type { useSectionDrag } from '../../hooks/useSectionDrag';

export interface SharedSectionProps {
  readOnly?: boolean;
  onFieldChange: (path: string, value: string | SkillItem[]) => void;
  onBulletAdd: (basePath: string, afterIndex: number) => string | void;
  onBulletRemove: (basePath: string, index: number) => void;
  onAddEntry: (sectionKey: string) => void;
  onRemoveEntry: (sectionKey: string, index: number) => void;
  onToggleSection: (sectionKey: string) => void;
  hiddenSections: Set<string>;
  onReorderEntries: (sectionKey: string, from: number, to: number) => void;
  onInput?: () => void;
  onRemoveSection?: (sectionKey: string) => void;
  sectionDrag: ReturnType<typeof useSectionDrag>;
  sectionIndex: number;
}
