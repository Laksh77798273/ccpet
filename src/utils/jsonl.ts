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

interface GlobalTracker {
  lastProcessedTimestamp: string;
  totalProcessedTokens: number;
}

export interface ClaudeCodeMessage {
  type: string;
  model?: string;
  sessionId?: string;
  uuid?: string;
  timestamp?: string;
  isSidechain?: boolean;
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

const GLOBAL_TRACKER_FILE = path.join(process.env.HOME || '', '.claude-pet', 'global-tracker.json');

function loadGlobalTracker(): GlobalTracker | null {
  try {
    if (!fs.existsSync(GLOBAL_TRACKER_FILE)) {
      return null;
    }
    const data = fs.readFileSync(GLOBAL_TRACKER_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

function saveGlobalTracker(tracker: GlobalTracker): void {
  try {
    const dir = path.dirname(GLOBAL_TRACKER_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(GLOBAL_TRACKER_FILE, JSON.stringify(tracker, null, 2));
  } catch (error) {
    console.error('Failed to save global tracker:', error);
  }
}

/**
 * Processes a JSONL transcript file to extract INCREMENTAL token metrics
 * Only processes new messages since last run based on global timestamp
 */
export async function getTokenMetrics(transcriptPath: string): Promise<TokenMetrics> {
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let sessionTotalInputTokens = 0;
  let sessionTotalOutputTokens = 0;
  let sessionTotalCachedTokens = 0;
  let contextLength = 0;
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

    // Load global tracker to find last processed timestamp
    const tracker = loadGlobalTracker();
    const lastGlobalTimestamp = tracker ? new Date(tracker.lastProcessedTimestamp).getTime() : 0;
    
    // Read and parse all messages
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
        messages.push(message);
      } catch (parseError) {
        continue;
      }
    }
    

    // Find the most recent main chain message for context length calculation
    let mostRecentMainChainEntry: ClaudeCodeMessage | null = null;
    let mostRecentTimestamp = 0;
    let mostRecentIndex = -1;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const usage = message.usage || (message.message && message.message.usage);
      
      // Always count session totals
      if (usage) {
        sessionTotalInputTokens += usage.input_tokens || 0;
        sessionTotalOutputTokens += usage.output_tokens || 0;
        sessionTotalCachedTokens += (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
      }

      // Track the most recent entry with isSidechain: false (or undefined, which defaults to main chain)
      if (message.isSidechain !== true && usage) {
        if (message.timestamp) {
          const entryTime = new Date(message.timestamp).getTime();
          if (!mostRecentTimestamp || entryTime > mostRecentTimestamp) {
            mostRecentTimestamp = entryTime;
            mostRecentMainChainEntry = message;
            mostRecentIndex = i;
          }
        } else {
          // If no timestamp, use message order (last message wins)
          if (i > mostRecentIndex) {
            mostRecentMainChainEntry = message;
            mostRecentIndex = i;
          }
        }
      }
    }

    // Calculate context length from the most recent main chain message
    if (mostRecentMainChainEntry) {
      const usage = mostRecentMainChainEntry.usage || (mostRecentMainChainEntry.message && mostRecentMainChainEntry.message.usage);
      if (usage) {
        contextLength = (usage.input_tokens || 0)
          + (usage.cache_read_input_tokens || 0)
          + (usage.cache_creation_input_tokens || 0);
      }
    }

    // Process messages incrementally - only process messages newer than last processed timestamp
    for (const message of messages) {
      const usage = message.usage || (message.message && message.message.usage);

      // Skip messages that are older than or equal to last processed timestamp
      if (message.timestamp && lastGlobalTimestamp > 0) {
        const messageTimestamp = new Date(message.timestamp).getTime();
        if (messageTimestamp <= lastGlobalTimestamp) {
          continue; // Skip already processed messages
        }
      }

      // Process this message for incremental tokens
      if (usage) {
        inputTokens += usage.input_tokens || 0;
        outputTokens += usage.output_tokens || 0;
        cachedTokens += (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
      }

      // Update tracking info - keep track of the latest timestamp
      if (message.timestamp) {
        const messageTimestamp = new Date(message.timestamp).getTime();
        const lastTimestamp = lastProcessedTimestamp ? new Date(lastProcessedTimestamp).getTime() : 0;
        if (messageTimestamp > lastTimestamp) {
          lastProcessedTimestamp = message.timestamp;
        }
      }
    }

    // Save updated global tracker
    if (lastProcessedTimestamp) {
      const newTracker: GlobalTracker = {
        lastProcessedTimestamp,
        totalProcessedTokens: (tracker?.totalProcessedTokens || 0) + inputTokens + outputTokens + cachedTokens
      };
      saveGlobalTracker(newTracker);
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