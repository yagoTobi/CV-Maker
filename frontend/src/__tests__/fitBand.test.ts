import { describe, it, expect } from 'vitest';
import { scoreToFitBand, FIT_BANDS } from '../utils/fitBand';

describe('scoreToFitBand', () => {
  it('maps band boundaries correctly', () => {
    expect(scoreToFitBand(0).name).toBe('Weak');
    expect(scoreToFitBand(39).name).toBe('Weak');
    expect(scoreToFitBand(40).name).toBe('Partial');
    expect(scoreToFitBand(59).name).toBe('Partial');
    expect(scoreToFitBand(60).name).toBe('Good');
    expect(scoreToFitBand(74).name).toBe('Good');
    expect(scoreToFitBand(75).name).toBe('Strong');
    expect(scoreToFitBand(89).name).toBe('Strong');
    expect(scoreToFitBand(90).name).toBe('Excellent');
    expect(scoreToFitBand(100).name).toBe('Excellent');
  });

  it('clamps out-of-range scores', () => {
    expect(scoreToFitBand(-25).name).toBe('Weak');
    expect(scoreToFitBand(150).name).toBe('Excellent');
  });

  it('rounds fractional scores before banding', () => {
    expect(scoreToFitBand(89.4).name).toBe('Strong'); // -> 89
    expect(scoreToFitBand(89.6).name).toBe('Excellent'); // -> 90
  });

  it('exposes a lowercase key for styling', () => {
    expect(scoreToFitBand(80).key).toBe('strong');
  });

  it('FIT_BANDS covers 0..100 contiguously (exactly one band per integer score)', () => {
    for (let s = 0; s <= 100; s++) {
      const matches = FIT_BANDS.filter((b) => s >= b.min && s <= b.max);
      expect(matches).toHaveLength(1);
    }
  });
});
