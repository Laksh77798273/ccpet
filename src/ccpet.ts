import { Pet, IPetState } from './core/Pet';
import { StatusBarFormatter } from './ui/StatusBar';
import { PetStorage } from './services/PetStorage';
import { getTokenMetrics } from './utils/jsonl';
import { PET_CONFIG } from './core/config';

// Simple animation counter for cycling expressions
class AnimationCounter {
  private callCount: number = 0;
  private readonly testMode: boolean;
  private readonly COUNTER_FILE = require('path').join(require('os').homedir(), '.claude-pet', 'animation-counter.json');

  constructor(testMode: boolean = false) {
    this.testMode = testMode;
    if (!testMode) {
      this.loadCounter();
    }
  }

  private loadCounter(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.COUNTER_FILE)) {
        const data = JSON.parse(fs.readFileSync(this.COUNTER_FILE, 'utf8'));
        this.callCount = data.callCount || 0;
      }
    } catch (error) {
      // 忽略加载错误，从0开始
      this.callCount = 0;
    }
  }

  private saveCounter(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // 确保目录存在
      const dir = path.dirname(this.COUNTER_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        callCount: this.callCount,
        lastUpdate: Date.now()
      };
      fs.writeFileSync(this.COUNTER_FILE, JSON.stringify(data));
    } catch (error) {
      // 忽略保存错误
    }
  }

  public recordCall(): void {
    // 在测试模式下不记录调用
    if (this.testMode) {
      return;
    }
    this.callCount++;
    this.saveCounter();
  }

  public shouldEnableAnimation(): boolean {
    // 在测试模式下禁用动画
    return !this.testMode;
  }

  public getFrameIndex(): number {
    // 基于调用次数返回帧索引，用于动画循环
    return this.callCount;
  }
}

class ClaudeCodeStatusLine {
  private pet: Pet;
  private formatter: StatusBarFormatter;
  private storage: PetStorage;
  private animationCounter: AnimationCounter;

  constructor(testMode: boolean = false) {
    this.animationCounter = new AnimationCounter(testMode);
    this.storage = new PetStorage();
    this.formatter = new StatusBarFormatter(testMode);
    
    // Load or create initial pet state
    const savedState = this.storage.loadState();
    const initialState: IPetState = savedState || {
      energy: PET_CONFIG.INITIAL_ENERGY,
      expression: PET_CONFIG.HAPPY_EXPRESSION,
      lastFeedTime: new Date(),
      totalTokensConsumed: 0,
      accumulatedTokens: 0,
      totalLifetimeTokens: 0
    };


    this.pet = new Pet(initialState, { config: PET_CONFIG });
    
    // Apply time decay since last session
    if (savedState) {
      this.pet.applyTimeDecay();
    }
  }

  public async processTokensAndGetStatusDisplay(claudeCodeInput: ClaudeCodeStatusInput): Promise<string> {
    try {
      // 记录函数调用以更新动画帧
      this.animationCounter.recordCall();
      
      // Always apply time decay first
      this.pet.applyTimeDecay();
      
      // Process tokens from JSONL transcript file
      const tokenMetrics = await getTokenMetrics(claudeCodeInput.transcript_path);
      
      if (tokenMetrics.totalTokens > 0) {
        // Feed pet with actual tokens (using new accumulation system)
        this.pet.feed(tokenMetrics.totalTokens);
      }
      
      // Get current state and update with session token info
      const state = this.pet.getState();
      state.sessionTotalInputTokens = tokenMetrics.sessionTotalInputTokens;
      state.sessionTotalOutputTokens = tokenMetrics.sessionTotalOutputTokens;
      state.sessionTotalCachedTokens = tokenMetrics.sessionTotalCachedTokens;
      
      // Calculate context metrics based on ccstatusline algorithms
      state.contextLength = tokenMetrics.contextLength;
      // Only calculate percentages if contextLength is defined
      if (tokenMetrics.contextLength !== undefined) {
        state.contextPercentage = Math.min(100, (tokenMetrics.contextLength / 200000) * 100);
        state.contextPercentageUsable = Math.min(100, (tokenMetrics.contextLength / 160000) * 100);
      }
      
      // 启用动画并获取当前帧索引
      const animationEnabled = this.animationCounter.shouldEnableAnimation();
      const frameIndex = this.animationCounter.getFrameIndex();
      
      // 获取动画表情
      const animatedExpression = this.pet.getAnimatedExpression(animationEnabled, frameIndex);
      
      // 显示宠物状态（带动画表情）
      return this.formatter.formatPetDisplay(state, animatedExpression);
      
    } catch (error) {
      console.error('Token processing failed:', error);
      // Apply time decay even on error
      this.pet.applyTimeDecay();
      // Fallback to current state without token processing
      const state = this.pet.getState();
      return this.formatter.formatPetDisplay(state);
    }
  }

  public getStatusDisplay(): string {
    // 记录函数调用以更新动画帧
    this.animationCounter.recordCall();
    
    // Apply time decay before getting display
    this.pet.applyTimeDecay();
    const state = this.pet.getState();
    
    // 启用动画并获取当前帧索引
    const animationEnabled = this.animationCounter.shouldEnableAnimation();
    const frameIndex = this.animationCounter.getFrameIndex();
    
    // 获取动画表情
    const animatedExpression = this.pet.getAnimatedExpression(animationEnabled, frameIndex);
    
    // 显示宠物状态（带动画表情）
    return this.formatter.formatPetDisplay(state, animatedExpression);
  }

  public saveState(): void {
    this.storage.saveState(this.pet.getState());
  }

  public adoptNewPet(): void {
    if (this.pet.isDead()) {
      this.pet.resetToInitialState();
      this.saveState();
      
      // Show success notification if VSCode API is available
      if (typeof window !== 'undefined' && window.vscode?.postMessage) {
        window.vscode.postMessage({
          command: 'showInformationMessage',
          text: 'Successfully adopted a new pet! Your pet is now happy and full of energy.'
        });
      }
    }
  }

  public isPetDead(): boolean {
    return this.pet.isDead();
  }
}

// Claude Code Status Hook Interface
interface ClaudeCodeStatusInput {
  hook_event_name: string;
  session_id: string;
  transcript_path: string;
  cwd: string;
  model: {
    id: string;
    display_name: string;
  };
  workspace: {
    current_dir: string;
    project_dir: string;
  };
  version: string;
  output_style: {
    name: string;
  };
  cost: {
    total_cost_usd: number;
    total_duration_ms: number;
    total_api_duration_ms: number;
    total_lines_added: number;
    total_lines_removed: number;
  };
}

// Function to read from stdin
function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    
    process.stdin.on('end', () => {
      resolve(input.trim());
    });
  });
}

// Main execution for CLI
export async function main(): Promise<void> {
  try {
    // Read Claude Code JSON input from stdin
    const inputData = await readStdin();
    // console.log('Input data:', inputData);
    
    if (!inputData) {
      // No input provided - show basic status
      const statusLine = new ClaudeCodeStatusLine();
      const display = statusLine.getStatusDisplay();
      statusLine.saveState();
      process.stdout.write(display);
      return;
    }
    
    let claudeCodeInput: ClaudeCodeStatusInput;
    try {
      claudeCodeInput = JSON.parse(inputData);
      // console.log('Claude Code input:', claudeCodeInput)
    } catch (error) {
      // Invalid JSON - show basic status
      const statusLine = new ClaudeCodeStatusLine();
      const display = statusLine.getStatusDisplay();
      statusLine.saveState();
      process.stdout.write(display);
      return;
    }
    
    const statusLine = new ClaudeCodeStatusLine();
    const display = await statusLine.processTokensAndGetStatusDisplay(claudeCodeInput);
    statusLine.saveState();
    
    // Output the status line display
    process.stdout.write(display);
  } catch (error) {
    // Fallback display on error
    process.stdout.write('(?) ERROR');
    process.stderr.write(`Pet status error: ${error}\n`);
    process.exit(1);
  }
}

// VSCode Extension Activation (if running in VSCode environment)
export function activate(context: any) {
  const statusLine = new ClaudeCodeStatusLine();

  // Register the adoptNewPet command
  context.subscriptions.push(
    {
      command: 'claude-pet.adoptNewPet',
      callback: () => {
        statusLine.adoptNewPet();
      }
    }
  );

  // Register command with VSCode if vscode API is available
  if (typeof window !== 'undefined' && window.vscode?.commands) {
    window.vscode.commands.registerCommand('claude-pet.adoptNewPet', () => {
      statusLine.adoptNewPet();
    });
  }
}

// VSCode Extension Deactivation
export function deactivate() {
  // Clean up if needed
}

// Note: main() is now called explicitly from cli.ts
// The automatic execution has been removed to prevent duplicate calls

export { ClaudeCodeStatusLine };
export { StatusBarFormatter } from './ui/StatusBar';