/**
 * Tests for api.generateSectionBullets method.
 *
 * Tests that api.generateSectionBullets:
 * - Returns {bullets, blocked, reason} on 200 success
 * - Returns null on 500 error (never throws, logs error)
 * - Returns {bullets: [], blocked: true, reason: 'rate-limited'} on 429
 * - Sends snake_case body (section_type, entry_context, user_answer, existing_bullets)
 * - Uses axiosInstance (Bearer token auto-attached by interceptor)
 * - Rethrows axios CanceledError (AbortSignal cancellation)
 */
import type { SectionAssistRequest, SectionAssistResult } from '../types';
import axios from 'axios';

interface AxiosResponse {
  data: SectionAssistResult;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: Record<string, unknown>;
}

interface AxiosError {
  response?: { status: number };
  code?: string;
}

const mockPost = vi.fn();
const mockAxiosInstance = {
  post: mockPost,
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock('axios', async (importActual) => {
  const actual = await importActual<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => mockAxiosInstance),
      isCancel: vi.fn((err: AxiosError) => err?.code === 'ERR_CANCELED'),
    },
  };
});

// Import after mocking
const { api } = await import('../services/api');

describe('api.generateSectionBullets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockClear();
  });

  it('method exists on api object', () => {
    expect(typeof api.generateSectionBullets).toBe('function');
  });

  describe('Given: 200 success response', () => {
    it('When: POST returns {bullets, blocked: false}, Then: returns the response data', async () => {
      const mockResponse: SectionAssistResult = {
        bullets: ['Led team of 5 engineers', 'Shipped feature in 2 weeks'],
        blocked: false,
      };

      mockPost.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as Record<string, unknown>,
      } as AxiosResponse);

      const req: SectionAssistRequest = {
        sectionType: 'work',
        entryContext: { title: 'Engineer', organization: 'Acme' },
      };

      const result = await api.generateSectionBullets(req);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Given: 429 rate-limited response', () => {
    it('When: POST throws 429 error, Then: returns {bullets: [], blocked: true, reason: "rate-limited"}', async () => {
      const error = new Error('Too Many Requests') as AxiosError;
      error.response = { status: 429 };
      mockPost.mockRejectedValueOnce(error);

      const req: SectionAssistRequest = {
        sectionType: 'education',
        entryContext: { title: 'BS Computer Science' },
      };

      const result = await api.generateSectionBullets(req);
      expect(result).toEqual({
        bullets: [],
        blocked: true,
        reason: 'rate-limited',
      });
    });
  });

  describe('Given: 500 server error', () => {
    it('When: POST throws 500 error, Then: returns null and logs error', async () => {
      const error = new Error('Internal Server Error') as AxiosError;
      error.response = { status: 500 };
      mockPost.mockRejectedValueOnce(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const req: SectionAssistRequest = {
        sectionType: 'project',
        entryContext: { title: 'My Project' },
      };

      const result = await api.generateSectionBullets(req);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[api:generateSectionBullets]'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Given: request body transformation', () => {
    it('When: generateSectionBullets is called, Then: POST body uses snake_case keys', async () => {
      mockPost.mockResolvedValueOnce({
        data: { bullets: [], blocked: false },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as Record<string, unknown>,
      } as AxiosResponse);

      const req: SectionAssistRequest = {
        sectionType: 'work',
        entryContext: { title: 'Engineer', organization: 'Acme', dates: '2020-2023' },
        userAnswer: 'I led a team',
        focus: 'leadership',
        existingBullets: ['Existing bullet'],
      };

      await api.generateSectionBullets(req);

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/section-assist'),
        expect.objectContaining({
          section_type: 'work',
          entry_context: { title: 'Engineer', organization: 'Acme', dates: '2020-2023' },
          user_answer: 'I led a team',
          focus: 'leadership',
          existing_bullets: ['Existing bullet'],
        }),
        expect.any(Object)
      );
    });
  });

  describe('Given: axiosInstance usage', () => {
    it('When: generateSectionBullets is called, Then: uses axiosInstance.post (Bearer auto-attached)', async () => {
      mockPost.mockResolvedValueOnce({
        data: { bullets: [], blocked: false },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as Record<string, unknown>,
      } as AxiosResponse);

      const req: SectionAssistRequest = {
        sectionType: 'additional',
        entryContext: {},
      };

      await api.generateSectionBullets(req);

      expect(mockPost).toHaveBeenCalled();
      const callArgs = mockPost.mock.calls[0];
      expect(callArgs[0]).toContain('/section-assist');
      expect(callArgs[1]).not.toHaveProperty('Authorization');
    });
  });

  describe('Given: AbortSignal cancellation', () => {
    it('When: POST throws axios CanceledError, Then: rethrows the error', async () => {
      const cancelError = new Error('Request canceled') as AxiosError;
      cancelError.code = 'ERR_CANCELED';
      mockPost.mockRejectedValueOnce(cancelError);

      vi.mocked(axios.isCancel).mockReturnValueOnce(true);

      const req: SectionAssistRequest = {
        sectionType: 'work',
        entryContext: {},
      };

      const abortController = new AbortController();

      await expect(api.generateSectionBullets(req, abortController.signal)).rejects.toThrow();
    });
  });

  describe('Given: timeout configuration', () => {
    it('When: generateSectionBullets is called, Then: uses 20s timeout', async () => {
      mockPost.mockResolvedValueOnce({
        data: { bullets: [], blocked: false },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as Record<string, unknown>,
      } as AxiosResponse);

      const req: SectionAssistRequest = {
        sectionType: 'work',
        entryContext: {},
      };

      await api.generateSectionBullets(req);

      const callArgs = mockPost.mock.calls[0];
      const config = callArgs[2] as Record<string, unknown>;
      expect(config).toHaveProperty('timeout', 20000);
    });
  });
});


