# Token Algorithm Refactor - Documentation Update

## 概述

此文档记录了从基于git/filesystem活动检测的token估算方法重构为基于Claude Code JSONL转录文件的真实token处理方法的重大架构变更。

## 变更日期
2025-08-22

## 变更原因

1. **准确性**: 原方法只是估算token消耗，新方法使用Claude Code API的真实token数据
2. **简化**: 移除了复杂的文件系统和git检测逻辑
3. **集成性**: 更好地与Claude Code status hook系统集成
4. **性能**: 减少了文件系统操作，提高了执行效率

## 架构变更

### 移除的组件
- `src/services/TokenMonitor.ts` - Token监控服务
- `src/services/__tests__/TokenMonitor.test.ts` - 相关测试
- `TOKEN_MONITOR_CONFIG` - 配置常量
- Git活动检测逻辑
- 文件系统活动检测逻辑

### 新增的组件
- `src/utils/jsonl.ts` - JSONL处理工具
- `src/utils/__tests__/jsonl.test.ts` - JSONL处理测试
- stdin输入处理逻辑
- Claude Code JSON输入接口

### 修改的组件
- `src/extension.ts` - 主要重构
  - 从命令行参数改为stdin输入
  - 集成JSONL处理
  - 简化错误处理
- `src/core/Pet.ts` - 增强时间衰减
  - 添加lastDecayTime追踪
  - 持续时间衰减支持
- `src/ui/StatusBar.ts` - 能量条计算优化
  - 从Math.floor改为Math.round
- `src/services/PetStorage.ts` - 简化状态管理
  - 移除token monitor状态
  - 添加lastDecayTime支持

## Token处理流程变更

### 旧流程 (基于活动检测)
1. CLI执行时检测git状态变化
2. 计算文件修改时间差
3. 估算token消耗 (文件变化 × 预设比率)
4. 转换为能量并喂养宠物

### 新流程 (基于JSONL转录)
1. Claude Code通过stdin传入JSON数据
2. 解析transcript_path获取JSONL文件路径
3. 处理JSONL文件提取真实token使用量
4. 转换为能量并喂养宠物 (10 tokens = 1 energy)

## 配置变更

### 移除的配置
```typescript
// 不再需要
export const TOKEN_MONITOR_CONFIG = {
  TOKEN_TO_ENERGY_RATE: 1,
  MAX_TOKENS_PER_SESSION: 100,
  ACTIVITY_DETECTION_METHOD: 'hybrid',
  MIN_TIME_BETWEEN_FEEDS: 5000,
  TOKENS_PER_FILE_CHANGE: 5,
  TOKENS_PER_LINE_CHANGE: 1
};
```

### 新的配置
```typescript
// 简化为固定比率
const TOKEN_TO_ENERGY_RATE = 0.1; // 10 tokens = 1 energy
```

## 测试变更

### 移除的测试
- TokenMonitor service测试 (37个测试用例)
- Git活动检测测试
- 文件系统活动检测测试
- 混合检测模式测试

### 新增的测试
- JSONL文件处理测试 (7个测试用例)
- stdin输入处理测试
- Claude Code JSON集成测试
- 错误处理和回退机制测试

## 用户体验改进

1. **能量条准确性**: 使用Math.round替代Math.floor，99.5%+显示为满格
2. **持续时间衰减**: 修复时间衰减只计算一次的bug，现在每次调用都会衰减
3. **真实反馈**: 基于实际AI交互的token消耗，而非估算

## Claude Code集成

### 配置方式不变
```json
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/ccpet/dist/extension.js",
    "padding": 0
  }
}
```

### 新的输入格式 (stdin)
```json
{
  "hook_event_name": "user-prompt-submit",
  "session_id": "...",
  "transcript_path": "/path/to/transcript.jsonl",
  "model": {"id": "claude-3-5-sonnet", "display_name": "Claude"},
  "workspace": {"current_dir": "/path", "project_dir": "/path"},
  "cost": {"total_cost_usd": 0.01, ...}
}
```

## 文档更新清单

- [x] `docs/stories/1.3.feeding-the-pet.md` - 任务和实现记录
- [x] `docs/architecture/api-integration.md` - API集成模板
- [ ] `docs/qa/story-1.3-manual-acceptance-tests.md` - QA测试流程
- [ ] 其他相关文档

## 影响评估

### 正面影响
- 更准确的token追踪
- 更简单的架构
- 更好的Claude Code集成
- 更稳定的时间衰减

### 潜在影响
- 需要更新QA测试流程
- 用户需要重启Claude Code以应用新配置
- 旧的测试场景不再适用

## 总结

此重构显著提升了宠物喂养系统的准确性和可靠性，从估算方法转向真实数据处理，并简化了整体架构。所有核心功能保持不变，用户体验得到改善。