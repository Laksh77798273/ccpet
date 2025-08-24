import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

export interface TokenMetrics {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  sessionTotalInputTokens: number;
  sessionTotalOutputTokens: number;
  sessionTotalCachedTokens: number;
  contextLength: number; // Current context length in tokens (from most recent message)
}

interface SessionTracker {
  sessionId: string;
  lastProcessedUuid: string;
  lastProcessedTimestamp: string;
  totalProcessedTokens: number;
}

export interface ClaudeCodeMessage {
  type: string;
  model?: string;
  sessionId?: string;
  uuid?: string;
  timestamp?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  content?: Array<{
    type: string;
    text?: string;
  }>;
  message?: {
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

const SESSION_TRACKER_FILE = path.join(process.env.HOME || '', '.claude-pet', 'session-tracker.json');

function loadSessionTracker(sessionId: string): SessionTracker | null {
  try {
    if (!fs.existsSync(SESSION_TRACKER_FILE)) {
      return null;
    }
    const data = fs.readFileSync(SESSION_TRACKER_FILE, 'utf8');
    const trackers: Record<string, SessionTracker> = JSON.parse(data);
    return trackers[sessionId] || null;
  } catch (error) {
    return null;
  }
}

function saveSessionTracker(tracker: SessionTracker): void {
  try {
    const dir = path.dirname(SESSION_TRACKER_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let trackers: Record<string, SessionTracker> = {};
    if (fs.existsSync(SESSION_TRACKER_FILE)) {
      const data = fs.readFileSync(SESSION_TRACKER_FILE, 'utf8');
      trackers = JSON.parse(data);
    }
    
    trackers[tracker.sessionId] = tracker;
    fs.writeFileSync(SESSION_TRACKER_FILE, JSON.stringify(trackers, null, 2));
  } catch (error) {
    console.error('Failed to save session tracker:', error);
  }
}

/**
 * Processes a JSONL transcript file to extract INCREMENTAL token metrics
 * Only processes new messages since last run for the given session
 */
export async function getTokenMetrics(transcriptPath: string): Promise<TokenMetrics> {
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let sessionTotalInputTokens = 0;
  let sessionTotalOutputTokens = 0;
  let sessionTotalCachedTokens = 0;
  let contextLength = 0;
  let sessionId = '';
  let lastProcessedUuid = '';
  let lastProcessedTimestamp = '';

  try {
    if (!fs.existsSync(transcriptPath)) {
      return { 
        inputTokens: 0, 
        outputTokens: 0, 
        cachedTokens: 0,
        totalTokens: 0,
        sessionTotalInputTokens: 0,
        sessionTotalOutputTokens: 0,
        sessionTotalCachedTokens: 0,
        contextLength: 0
      };
    }

    // First pass: get sessionId and find where to start processing
    const fileStream = fs.createReadStream(transcriptPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const messages: ClaudeCodeMessage[] = [];
    for await (const line of rl) {
      if (line.trim() === '') continue;
      
      try {
        const message: ClaudeCodeMessage = JSON.parse(line);
        if (message.sessionId) {
          sessionId = message.sessionId;
        }
        messages.push(message);
      } catch (parseError) {
        continue;
      }
    }

    if (!sessionId) {
      return { 
        inputTokens: 0, 
        outputTokens: 0, 
        cachedTokens: 0,
        totalTokens: 0,
        sessionTotalInputTokens: 0,
        sessionTotalOutputTokens: 0,
        sessionTotalCachedTokens: 0,
        contextLength: 0
      };
    }

    // Load session tracker to find last processed position
    const tracker = loadSessionTracker(sessionId);
    let startProcessing = tracker ? false : true; // If no tracker, process from beginning

    // Process messages incrementally
    for (const message of messages) {
      const usage = message.usage || (message.message && message.message.usage);
      
      // Always count session totals
      if (usage) {
        sessionTotalInputTokens += usage.input_tokens || 0;
        sessionTotalOutputTokens += usage.output_tokens || 0;
        sessionTotalCachedTokens += (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
        
        // Update context length from the most recent message (last processed)
        // Context length = input tokens + cached tokens for current context
        contextLength = (usage.input_tokens || 0) + 
                       (usage.cache_read_input_tokens || 0) + 
                       (usage.cache_creation_input_tokens || 0);
      }

      // If we have a tracker, skip until we find the last processed message
      if (tracker && !startProcessing) {
        if (message.uuid === tracker.lastProcessedUuid) {
          startProcessing = true;
          continue; // Skip the already processed message
        }
        continue;
      }

      // Process this message for incremental tokens
      if (usage) {
        inputTokens += usage.input_tokens || 0;
        outputTokens += usage.output_tokens || 0;
        cachedTokens += (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
      }

      // Update tracking info
      if (message.uuid) {
        lastProcessedUuid = message.uuid;
      }
      if (message.timestamp) {
        lastProcessedTimestamp = message.timestamp;
      }
    }

    // Save updated session tracker
    if (lastProcessedUuid) {
      const newTracker: SessionTracker = {
        sessionId,
        lastProcessedUuid,
        lastProcessedTimestamp,
        totalProcessedTokens: (tracker?.totalProcessedTokens || 0) + inputTokens + outputTokens + cachedTokens
      };
      saveSessionTracker(newTracker);
    }

    return {
      inputTokens,
      outputTokens,
      cachedTokens,
      totalTokens: inputTokens + outputTokens + cachedTokens,
      sessionTotalInputTokens,
      sessionTotalOutputTokens,
      sessionTotalCachedTokens,
      contextLength
    };
  } catch (error) {
    console.error('Failed to process JSONL transcript:', error);
    return { 
      inputTokens: 0, 
      outputTokens: 0, 
      cachedTokens: 0,
      totalTokens: 0,
      sessionTotalInputTokens: 0,
      sessionTotalOutputTokens: 0,
      sessionTotalCachedTokens: 0,
      contextLength: 0
    };
  }
}