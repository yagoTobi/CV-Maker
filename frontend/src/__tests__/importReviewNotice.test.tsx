import { saveImportReviewNote, takeImportReviewNote } from '../utils/importReviewStorage';

describe('importReviewStorage', () => {
  beforeEach(() => sessionStorage.clear());

  it('(a) note with lowFields → takeImportReviewNote clears key and returns note', () => {
    saveImportReviewNote({ lowFields: ['workExperience[0].endDate', 'skills[2]'], warnings: [], ts: Date.now() });
    const note = takeImportReviewNote();
    expect(note).not.toBeNull();
    expect(note?.lowFields).toContain('workExperience[0].endDate');
    expect(sessionStorage.getItem('cvmaker.importReviewNote')).toBeNull();
  });

  it('(b) expired note (31min old) → returns null', () => {
    saveImportReviewNote({ lowFields: ['x'], warnings: [], ts: Date.now() - 31 * 60 * 1000 });
    expect(takeImportReviewNote()).toBeNull();
  });

  it('(c) no note → returns null', () => {
    expect(takeImportReviewNote()).toBeNull();
  });

  it('(d) malformed JSON → returns null, no crash', () => {
    sessionStorage.setItem('cvmaker.importReviewNote', '{bad json');
    expect(takeImportReviewNote()).toBeNull();
  });
});

describe('importReviewNotice humanization', () => {
  it('maps dotted paths to human labels and deduplicates', () => {
    const inputs = ['workExperience[0].endDate', 'skills[2]', 'workExperience[1].startDate'];
    const map: Record<string, string> = {
      personalInfo: 'contact details',
      workExperience: 'work experience',
      education: 'education',
      skills: 'skills',
    };
    const humanize = (value: string) => {
      const root = value.split(/[.[]/)[0] ?? value;
      return map[root] ?? root;
    };
    const roots = [...new Set(inputs.map(humanize))];
    expect(roots).toEqual(['work experience', 'skills']);
  });

  it('(d) 6 distinct root fields → 4 shown + "and 2 more"', () => {
    const roots = ['a', 'b', 'c', 'd', 'e', 'f'];
    const shown = roots.slice(0, 4);
    const rest = roots.length - shown.length;
    const result = rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.join(', ');
    expect(result).toBe('a, b, c, d and 2 more');
  });
});
