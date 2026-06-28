/**
 * Tests for the per-browser user-id helper (services/userId.ts).
 *
 * This id is sent as the X-User-Id header so the backend partitions storage
 * per browser instead of collapsing every session onto the shared "local" user.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getUserId } from '../services/userId';

const STORAGE_KEY = 'cv-maker:user-id';

describe('getUserId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an anonymous id with the expected prefix', () => {
    const id = getUserId();
    expect(id).toMatch(/^anon-/);
    expect(id.length).toBeGreaterThan('anon-'.length);
  });

  it('persists the id to localStorage', () => {
    const id = getUserId();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(id);
  });

  it('returns the same id across calls (stable per browser)', () => {
    const first = getUserId();
    const second = getUserId();
    expect(second).toBe(first);
  });

  it('reuses an already-stored id rather than regenerating', () => {
    localStorage.setItem(STORAGE_KEY, 'anon-existing-id');
    expect(getUserId()).toBe('anon-existing-id');
  });

  it('generates a new id after storage is cleared', () => {
    const first = getUserId();
    localStorage.clear();
    const second = getUserId();
    expect(second).not.toBe(first);
    expect(second).toMatch(/^anon-/);
  });
});
