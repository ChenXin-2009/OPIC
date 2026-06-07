import { fetchWithTimeout, fetchWithRetry, timedRequest, HttpRequestError } from '../http-client';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

function mockResponse(overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve({ data: 'ok' }),
    text: () => Promise.resolve('ok'),
    ...overrides,
  } as Response;
}

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should fetch successfully before timeout', async () => {
    mockFetch.mockResolvedValue(mockResponse());
    const response = await fetchWithTimeout('http://test/api', 5000);
    expect(response.status).toBe(200);
  });

  it('should throw HttpRequestError on timeout', async () => {
    mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
      const signal = options?.signal as AbortSignal;
      return new Promise<Response>((_, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    const promise = fetchWithTimeout('http://test/api', 50);
    await expect(promise).rejects.toThrow(HttpRequestError);
  }, 3000);
});

describe('fetchWithRetry', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should return result on successful fetch', async () => {
    mockFetch.mockResolvedValue(mockResponse());
    const result = await fetchWithRetry('http://test/api');
    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
  });

  it('should retry on retryable status codes', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ ok: false, status: 500, statusText: 'Server Error' }));
    mockFetch
      .mockResolvedValueOnce(mockResponse({ ok: false, status: 500, statusText: 'Server Error' }));
    mockFetch
      .mockResolvedValueOnce(mockResponse());
    const result = await fetchWithRetry('http://test/api', 5000, {}, { maxRetries: 3, retryDelay: 10 });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should throw on non-retryable status code', async () => {
    mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 404, statusText: 'Not Found' }));
    await expect(fetchWithRetry('http://test/api', 5000, {}, { maxRetries: 1, retryDelay: 10 }))
      .rejects.toThrow(HttpRequestError);
  });

  it('should throw after exhausting retries', async () => {
    mockFetch.mockResolvedValue(mockResponse({ ok: false, status: 500, statusText: 'Error' }));
    await expect(fetchWithRetry('http://test/api', 5000, {}, { maxRetries: 2, retryDelay: 10 }))
      .rejects.toThrow(HttpRequestError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should retry on network errors', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockResolvedValueOnce(mockResponse());
    const result = await fetchWithRetry('http://test/api', 5000, {}, { maxRetries: 2, retryDelay: 10 });
    expect(result.success).toBe(true);
  });
});

describe('timedRequest', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should return result with timing', async () => {
    mockFetch.mockResolvedValue(mockResponse());
    const result = await timedRequest('http://test/api');
    expect(result.success).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should throw HttpRequestError on failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    await expect(timedRequest('http://test/api')).rejects.toThrow(HttpRequestError);
  });

  it('should parse JSON response', async () => {
    mockFetch.mockResolvedValue(mockResponse());
    const result = await timedRequest<any>('http://test/api');
    expect(result.data).toEqual({ data: 'ok' });
  });

  it('should parse text response', async () => {
    mockFetch.mockResolvedValue(mockResponse({
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('plain text'),
    }));
    const result = await timedRequest('http://test/api');
    expect(result.data).toBe('plain text');
  });
});
