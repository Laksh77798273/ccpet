import * as fs from 'fs';
import * as readline from 'readline';

export interface TokenMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ClaudeCodeMessage {
  type: string;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  content?: Array<{
    type: string;
    text?: string;
  }>;
}

/**
 * Processes a JSONL transcript file to extract token metrics
 * Based on ccstatusline documentation for proper token processing
 */
export async function getTokenMetrics(transcriptPath: string): Promise<TokenMetrics> {
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    if (!fs.existsSync(transcriptPath)) {
      return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    }

    const fileStream = fs.createReadStream(transcriptPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim() === '') continue;
      
      try {
        const message: ClaudeCodeMessage = JSON.parse(line);
        
        // Extract token usage from Claude API responses
        if (message.usage) {
          inputTokens += message.usage.input_tokens || 0;
          outputTokens += message.usage.output_tokens || 0;
        }
      } catch (parseError) {
        // Skip malformed JSON lines
        continue;
      }
    }

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    };
  } catch (error) {
    console.error('Failed to process JSONL transcript:', error);
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }
}