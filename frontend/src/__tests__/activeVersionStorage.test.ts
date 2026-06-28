/**
 * Tests for the active-version sessionStorage pointer (utils/activeVersionStorage.ts).
 *
 * Regression guard for the "pre-load existing CV" bug: the editor must only
 * restore the version the user was explicitly editing, never the most-recent
 * saved CV. This module is the persistence mechanism behind that.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { persistActiveVersionId, getStoredActiveVersionId } from '../utils/activeVersionStorage';

const STORAGE_KEY = 'cv-maker:active-version-id';

describe('activeVersionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(getStoredActiveVersionId()).toBeNull();
  });

  it('persists and reads back an id', () => {
    persistActiveVersionId('version-123');
    expect(getStoredActiveVersionId()).toBe('version-123');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('version-123');
  });

  it('clears the stored id when passed null', () => {
    persistActiveVersionId('version-123');
    persistActiveVersionId(null);
    expect(getStoredActiveVersionId()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('overwrites a previously stored id', () => {
    persistActiveVersionId('version-a');
    persistActiveVersionId('version-b');
    expect(getStoredActiveVersionId()).toBe('version-b');
  });
});
