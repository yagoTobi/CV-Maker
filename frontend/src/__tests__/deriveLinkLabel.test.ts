import { describe, it, expect } from 'vitest';
import { deriveLinkLabel } from '../utils/deriveLinkLabel';

describe('deriveLinkLabel', () => {
  describe('known platform detection', () => {
    it('derives "GitHub" from github.com URL', () => {
      expect(deriveLinkLabel('https://github.com/testuser')).toBe('GitHub');
    });

    it('derives "LinkedIn" from linkedin.com URL', () => {
      expect(deriveLinkLabel('https://linkedin.com/in/testuser')).toBe('LinkedIn');
    });

    it('derives "Twitter" from twitter.com URL', () => {
      expect(deriveLinkLabel('https://twitter.com/testuser')).toBe('Twitter');
    });

    it('derives "Twitter" from x.com URL', () => {
      expect(deriveLinkLabel('https://x.com/testuser')).toBe('Twitter');
    });

    it('derives "GitLab" from gitlab.com URL', () => {
      expect(deriveLinkLabel('https://gitlab.com/testuser')).toBe('GitLab');
    });

    it('derives "Kaggle" from kaggle.com URL', () => {
      expect(deriveLinkLabel('https://kaggle.com/testuser')).toBe('Kaggle');
    });

    it('derives "Medium" from medium.com URL', () => {
      expect(deriveLinkLabel('https://medium.com/@testuser')).toBe('Medium');
    });

    it('derives "Stack Overflow" from stackoverflow.com URL', () => {
      expect(deriveLinkLabel('https://stackoverflow.com/users/12345')).toBe('Stack Overflow');
    });

    it('derives "Google Scholar" from scholar.google.com URL', () => {
      expect(deriveLinkLabel('https://scholar.google.com/citations?user=abc')).toBe('Google Scholar');
    });

    it('derives "ResearchGate" from researchgate.net URL', () => {
      expect(deriveLinkLabel('https://researchgate.net/profile/test')).toBe('ResearchGate');
    });

    it('derives "ORCID" from orcid.org URL', () => {
      expect(deriveLinkLabel('https://orcid.org/0000-0002-1234-5678')).toBe('ORCID');
    });
  });

  describe('case insensitivity', () => {
    it('matches GitHub regardless of case', () => {
      expect(deriveLinkLabel('https://GITHUB.COM/user')).toBe('GitHub');
    });

    it('matches LinkedIn regardless of case', () => {
      expect(deriveLinkLabel('HTTPS://LINKEDIN.COM/in/user')).toBe('LinkedIn');
    });
  });

  describe('URLs without protocol', () => {
    it('matches github.com without https://', () => {
      expect(deriveLinkLabel('github.com/testuser')).toBe('GitHub');
    });

    it('matches linkedin.com/in/testuser without https://', () => {
      expect(deriveLinkLabel('linkedin.com/in/testuser')).toBe('LinkedIn');
    });
  });

  describe('fallback to hostname', () => {
    it('returns hostname for unknown URL with protocol', () => {
      expect(deriveLinkLabel('https://myportfolio.dev/about')).toBe('myportfolio.dev');
    });

    it('strips www. prefix from hostname', () => {
      expect(deriveLinkLabel('https://www.example.com/cv')).toBe('example.com');
    });

    it('auto-adds https:// for URLs without protocol', () => {
      expect(deriveLinkLabel('mysite.org')).toBe('mysite.org');
    });
  });

  describe('edge cases', () => {
    it('returns raw string for invalid URL that cannot be parsed', () => {
      expect(deriveLinkLabel('not a url at all')).toBe('not a url at all');
    });

    it('returns empty string for empty input', () => {
      expect(deriveLinkLabel('')).toBe('');
    });

    it('handles URL with port number', () => {
      expect(deriveLinkLabel('https://github.com:443/user')).toBe('GitHub');
    });

    it('handles URL with query parameters', () => {
      expect(deriveLinkLabel('https://github.com/user?tab=repos')).toBe('GitHub');
    });

    it('handles URL with hash fragment', () => {
      expect(deriveLinkLabel('https://linkedin.com/in/user#experience')).toBe('LinkedIn');
    });
  });
});
