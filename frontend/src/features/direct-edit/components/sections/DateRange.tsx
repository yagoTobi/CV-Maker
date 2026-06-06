import { EditableField } from '../editor-primitives/EditableField';
import type { SkillItem } from '../../../../types';
import styles from '../MedLengthTemplate.module.css';

interface DateRangeProps {
  startDate: string;
  endDate: string;
  startPath: string;
  endPath: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  onFieldChange: (path: string, value: string | SkillItem[]) => void;
  onInput?: () => void;
  readOnly?: boolean;
}

export function DateRange({
  startDate,
  endDate,
  startPath,
  endPath,
  startPlaceholder = 'Start',
  endPlaceholder = 'Present',
  onFieldChange,
  onInput,
  readOnly,
}: DateRangeProps) {
  return (
    <span className={styles.dateRange}>
      <EditableField
        value={startDate}
        fieldPath={startPath}
        onFieldChange={onFieldChange}
        placeholder={startPlaceholder}
        className={styles.bold}
        onInput={onInput}
        readOnly={readOnly}
      />
      <span className={styles.dateSeparator}>{'\u2013'}</span>
      <EditableField
        value={endDate}
        fieldPath={endPath}
        onFieldChange={onFieldChange}
        placeholder={endPlaceholder}
        className={styles.bold}
        onInput={onInput}
        readOnly={readOnly}
      />
    </span>
  );
}
