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
      totalTokens: 0
    });
    expect(fs.existsSync).toHaveBeenCalledWith(mockTranscriptPath);
  });

  it('should parse valid JSONL with token usage', async () => {
    const mockLines = [
      '{"type": "message", "usage": {"input_tokens": 100, "output_tokens": 50}}',
      '{"type": "message", "usage": {"input_tokens": 200, "output_tokens": 75}}',
      '{"type": "other"}', // No usage
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
      totalTokens: 425  // 300 + 125
    });
  });

  it('should handle malformed JSON lines gracefully', async () => {
    const mockLines = [
      '{"type": "message", "usage": {"input_tokens": 100, "output_tokens": 50}}',
      'invalid json line',
      '{"type": "message", "usage": {"input_tokens": 200, "output_tokens": 75}}'
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
      totalTokens: 425
    });
  });

  it('should handle messages without usage property', async () => {
    const mockLines = [
      '{"type": "message", "content": [{"type": "text", "text": "Hello"}]}',
      '{"type": "message", "usage": {"input_tokens": 50, "output_tokens": 25}}',
      '{"type": "other", "data": "something"}'
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
      totalTokens: 75
    });
  });

  it('should handle partial usage data', async () => {
    const mockLines = [
      '{"type": "message", "usage": {"input_tokens": 100}}', // Missing output_tokens
      '{"type": "message", "usage": {"output_tokens": 50}}', // Missing input_tokens
      '{"type": "message", "usage": {"input_tokens": null, "output_tokens": 25}}'
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
      totalTokens: 175
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
      totalTokens: 0
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
      totalTokens: 0
    });
  });
});