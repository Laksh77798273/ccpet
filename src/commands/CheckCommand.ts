import { ClaudeCodeStatusLine } from '../ccpet';

export class CheckCommand {
  name = 'check';
  description = 'Manually check pet status without consuming Claude Code tokens';

  async execute(_args: string[]): Promise<void> {
    try {
      console.log('🐾 检查宠物状态...\n');
      
      const statusLine = new ClaudeCodeStatusLine();
      const display = statusLine.getStatusDisplay();
      statusLine.saveState();
      
      console.log(display);
      console.log('\n💡 提示: 这次查看不消耗Claude Code token');
      console.log('📝 在Claude Code中活跃使用可以喂养你的宠物');
      
      // 显示距离上次喂食的时间
      const petState = (statusLine as any).pet ? (statusLine as any).pet.getState() : null;
      if (petState && petState.lastFeedTime) {
        const timeSinceLastFeed = Date.now() - new Date(petState.lastFeedTime).getTime();
        const minutes = Math.floor(timeSinceLastFeed / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
          console.log(`⏰ 距离上次喂食: ${hours}小时${minutes % 60}分钟前`);
        } else {
          console.log(`⏰ 距离上次喂食: ${minutes}分钟前`);
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 检查宠物状态失败:', errorMessage);
      process.exit(1);
    }
  }
}