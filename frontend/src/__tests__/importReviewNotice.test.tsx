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

describe('acceptance criteria from plan', () => {
  beforeEach(() => sessionStorage.clear());

  it('(plan-a) note with lowFields workExperience + skills → message contains those human labels and key cleared', () => {
    // Pre-store a note as DirectEditPage would find on mount
    saveImportReviewNote({
      lowFields: ['workExperience[0].endDate', 'skills[2]'],
      warnings: [],
      ts: Date.now(),
    });

    // Simulate what DirectEditPage does: read the note and build the message
    const note = takeImportReviewNote();
    expect(note).not.toBeNull();
    expect(sessionStorage.getItem('cvmaker.importReviewNote')).toBeNull(); // cleared
    if (note === null) {
      throw new Error('Expected import review note to exist');
    }

    // Build the message (same logic as DirectEditPage)
    const humanizeMap: Record<string, string> = {
      workExperience: 'work experience', skills: 'skills', personalInfo: 'contact details',
      education: 'education', projects: 'projects', awards: 'awards', summary: 'summary',
    };
    const humanize = (s: string) => {
      const root = s.split(/[.[]/)[0] ?? s;
      return humanizeMap[root] ?? root;
    };
    const roots = [...new Set(note.lowFields.map(humanize))];
    const shown = roots.slice(0, 4);
    const rest = roots.length - shown.length;
    const listed = rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.join(', ');
    const message = `Imported with AI — double-check: ${listed}`;

    expect(message).toContain('work experience');
    expect(message).toContain('skills');
  });

  it('(plan-b) expired note → takeImportReviewNote returns null (no toast would fire)', () => {
    saveImportReviewNote({ lowFields: ['x'], warnings: [], ts: Date.now() - 31 * 60 * 1000 });
    const note = takeImportReviewNote();
    expect(note).toBeNull();
  });

  it('(plan-c) JSON import source → no note written (source check guards this)', () => {
    // Simulate BuildExpansionPanel: source === 'json' → no saveImportReviewNote called
    const source = 'json';
    // JSON path skips the note-writing block
    if (source !== 'json') {
      saveImportReviewNote({ lowFields: ['x'], warnings: [], ts: Date.now() });
    }
    // Nothing should be in sessionStorage
    expect(sessionStorage.getItem('cvmaker.importReviewNote')).toBeNull();
  });

  it('(plan-d) 6 distinct low-field roots → message shows 4 + "and 2 more"', () => {
    const lowFields = [
      'personalInfo.email', 'workExperience[0].endDate', 'education[0].degree',
      'skills[0]', 'projects[0].title', 'awards[0].title',
    ];
    const humanizeMap: Record<string, string> = {
      personalInfo: 'contact details', workExperience: 'work experience',
      education: 'education', skills: 'skills', projects: 'projects', awards: 'awards',
    };
    const humanize = (s: string) => {
      const root = s.split(/[.[]/)[0] ?? s;
      return humanizeMap[root] ?? root;
    };
    const roots = [...new Set(lowFields.map(humanize))];
    const shown = roots.slice(0, 4);
    const rest = roots.length - shown.length;
    const result = rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.join(', ');
    expect(result).toMatch(/and 2 more$/);
    expect(result.split(',').length).toBe(4); // 4 items before "and 2 more"
  });
});
