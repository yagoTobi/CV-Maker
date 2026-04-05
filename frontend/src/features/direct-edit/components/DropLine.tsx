/**
 * DropLine -- Horizontal blue accent line rendered at drop target position.
 * Visual-only feedback during drag operations.
 */
import styles from './DropLine.module.css';

export function DropLine() {
  return <div className={styles.dropLine} aria-hidden="true" />;
}
