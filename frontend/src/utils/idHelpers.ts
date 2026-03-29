import { nanoid } from 'nanoid';

/** Generate a stable unique ID for a data model entry. */
export function generateId(): string {
  return nanoid(); // 21-char URL-safe string
}
