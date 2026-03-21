import styles from "../CVFormBuilder.module.css";

export function Field({
  label,
  required,
  confidence,
  children,
}: {
  label: string;
  required?: boolean;
  confidence?: 'low' | 'medium';
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.field} ${confidence === 'low' ? styles.confidenceLow : ''}`}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
        {confidence === 'low' && (
          <span className={styles.needsReview} title="This field was unclear in the source — please verify">Needs review</span>
        )}
        {confidence === 'medium' && (
          <span className={styles.pleaseReview} title="We had to infer this value — please review">Please review</span>
        )}
      </label>
      {children}
    </div>
  );
}
