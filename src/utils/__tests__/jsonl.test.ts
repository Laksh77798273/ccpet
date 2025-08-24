import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTokenMetrics } from '../jsonl';
import * as fs from 'fs';
import * as readline from 'readline';

// Mock filesystem and readline modules
vi.mock('fs');
vi.mock('readline');

describe('getTokenMetrics', () => {
  const mockTranscriptPath = '/mock/transcript.jsonl';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock session tracker file operations to avoid interference between tests
    vi.mocked(fs.readFileSync).mockReturnValue('{}');
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.mkdirSync).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return zero metrics when file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await getTokenMetrics(mockTranscriptPath);

    expect(result).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      sessionTotalInputTokens: 0,
      sessionTotalOutputTokens: 0,
      sessionTotalCachedTokens: 0,
      contextLength: 0
    });
    expect(fs.existsSync).toHaveBeenCalledWith(mockTranscriptPath);
  });

  it('should parse valid JSONL with token usage', async () => {
    const mockLines = [
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid1", "usage": {"input_tokens": 100, "output_tokens": 50}}',
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid2", "usage": {"input_tokens": 200, "output_tokens": 75}}',
      '{"type": "other", "sessionId": "test-session", "uuid": "uuid3"}', // No usage
      '' // Empty line
    ];

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.createReadStream).mockReturnValue({} as any);

    const mockInterface = {
      [Symbol.asyncIterator]: async function* () {
        for (const line of mockLines) {
          yield line;
        }
      }
    };

    vi.mocked(readline.createInterface).mockReturnValue(mockInterface as any);

    const result = await getTokenMetrics(mockTranscriptPath);

    expect(result).toEqual({
      inputTokens: 300, // 100 + 200
      outputTokens: 125, // 50 + 75
      cachedTokens: 0,
      totalTokens: 425,  // 300 + 125
      sessionTotalInputTokens: 300,
      sessionTotalOutputTokens: 125,
      sessionTotalCachedTokens: 0,
      contextLength: 200 // input_tokens from most recent message (uuid2)
    });
  });

  it('should handle malformed JSON lines gracefully', async () => {
    const mockLines = [
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid1", "usage": {"input_tokens": 100, "output_tokens": 50}}',
      'invalid json line',
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid2", "usage": {"input_tokens": 200, "output_tokens": 75}}'
    ];

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.createReadStream).mockReturnValue({} as any);

    const mockInterface = {
      [Symbol.asyncIterator]: async function* () {
        for (const line of mockLines) {
          yield line;
        }
      }
    };

    vi.mocked(readline.createInterface).mockReturnValue(mockInterface as any);

    const result = await getTokenMetrics(mockTranscriptPath);

    // Should skip malformed line and process valid lines
    expect(result).toEqual({
      inputTokens: 300, // 100 + 200
      outputTokens: 125, // 50 + 75
      cachedTokens: 0,
      totalTokens: 425,
      sessionTotalInputTokens: 300,
      sessionTotalOutputTokens: 125,
      sessionTotalCachedTokens: 0,
      contextLength: 200 // input_tokens from most recent valid message
    });
  });

  it('should handle messages without usage property', async () => {
    const mockLines = [
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid1", "content": [{"type": "text", "text": "Hello"}]}',
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid2", "usage": {"input_tokens": 50, "output_tokens": 25}}',
      '{"type": "other", "sessionId": "test-session", "uuid": "uuid3", "data": "something"}'
    ];

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.createReadStream).mockReturnValue({} as any);

    const mockInterface = {
      [Symbol.asyncIterator]: async function* () {
        for (const line of mockLines) {
          yield line;
        }
      }
    };

    vi.mocked(readline.createInterface).mockReturnValue(mockInterface as any);

    const result = await getTokenMetrics(mockTranscriptPath);

    expect(result).toEqual({
      inputTokens: 50,
      outputTokens: 25,
      cachedTokens: 0,
      totalTokens: 75,
      sessionTotalInputTokens: 50,
      sessionTotalOutputTokens: 25,
      sessionTotalCachedTokens: 0,
      contextLength: 50 // input_tokens from uuid2
    });
  });

  it('should handle partial usage data', async () => {
    const mockLines = [
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid1", "usage": {"input_tokens": 100}}', // Missing output_tokens
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid2", "usage": {"output_tokens": 50}}', // Missing input_tokens
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid3", "usage": {"input_tokens": null, "output_tokens": 25}}'
    ];

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.createReadStream).mockReturnValue({} as any);

    const mockInterface = {
      [Symbol.asyncIterator]: async function* () {
        for (const line of mockLines) {
          yield line;
        }
      }
    };

    vi.mocked(readline.createInterface).mockReturnValue(mockInterface as any);

    const result = await getTokenMetrics(mockTranscriptPath);

    expect(result).toEqual({
      inputTokens: 100, // Only first message has input_tokens
      outputTokens: 75, // 50 + 25
      cachedTokens: 0,
      totalTokens: 175,
      sessionTotalInputTokens: 100,
      sessionTotalOutputTokens: 75,
      sessionTotalCachedTokens: 0,
      contextLength: 0 // Last message (uuid3) has null input_tokens
    });
  });

  it('should handle file reading errors gracefully', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.createReadStream).mockImplementation(() => {
      throw new Error('File read error');
    });

    const result = await getTokenMetrics(mockTranscriptPath);

    expect(result).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      sessionTotalInputTokens: 0,
      sessionTotalOutputTokens: 0,
      sessionTotalCachedTokens: 0,
      contextLength: 0
    });
  });

  it('should handle empty JSONL file', async () => {
    const mockLines: string[] = [];

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.createReadStream).mockReturnValue({} as any);

    const mockInterface = {
      [Symbol.asyncIterator]: async function* () {
        for (const line of mockLines) {
          yield line;
        }
      }
    };

    vi.mocked(readline.createInterface).mockReturnValue(mockInterface as any);

    const result = await getTokenMetrics(mockTranscriptPath);

    expect(result).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      sessionTotalInputTokens: 0,
      sessionTotalOutputTokens: 0,
      sessionTotalCachedTokens: 0,
      contextLength: 0
    });
  });

  it('should handle cached tokens from usage data', async () => {
    const mockLines = [
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid1", "usage": {"input_tokens": 100, "output_tokens": 50, "cache_creation_input_tokens": 25}}',
      '{"type": "message", "sessionId": "test-session", "uuid": "uuid2", "usage": {"input_tokens": 200, "output_tokens": 75, "cache_read_input_tokens": 30}}'
    ];

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.createReadStream).mockReturnValue({} as any);

    const mockInterface = {
      [Symbol.asyncIterator]: async function* () {
        for (const line of mockLines) {
          yield line;
        }
      }
    };

    vi.mocked(readline.createInterface).mockReturnValue(mockInterface as any);

    const result = await getTokenMetrics(mockTranscriptPath);

    expect(result).toEqual({
      inputTokens: 300, // 100 + 200
      outputTokens: 125, // 50 + 75
      cachedTokens: 55, // 25 + 30
      totalTokens: 480, // 300 + 125 + 55
      sessionTotalInputTokens: 300,
      sessionTotalOutputTokens: 125,
      sessionTotalCachedTokens: 55,
      contextLength: 230 // 200 input + 30 cache_read from uuid2
    });
  });
});