# ccpet

[English](README.md)

一个用于状态栏显示的极简 Node.js CLI 虚拟宠物。宠物的能量会随时间衰减、在你消耗 token 时增加，并在会话之间持久化保存。

- 入口: `src/ccpet.ts` → 构建为 `dist/ccpet.js`
- 二进制文件名 (链接后): `ccpet`
- 状态文件: `~/.claude-pet/pet-state.json`
- 会话追踪: `~/.claude-pet/session-tracker.json`

## 功能特性
- 包含衰减和喂养的能量模型
  - 基于时间的衰减 (约每分钟 0.0231，约 3 天从 100 → 0)
  - 通过 token 使用进行喂养 (1,000,000 tokens = +1 能量)
- 基于阈值的表情 (来自 `src/core/config.ts`)
  - `HAPPY (>=80)`: `(^_^)`
  - `HUNGRY (>=40)`: `(o_o)`
  - `SICK (>=10)`: `(u_u)`
  - `DEAD (<10)`: `(x_x)`
- 状态输出 (彩色): 表情 + 能量条 + 能量值 + 累计的 tokens
- 会话指标行: 输入 / 输出 / 缓存 / 总 tokens
- 跨会话持久化状态

## 环境要求
- Node.js >= 20
- npm >= 9

## 安装与构建
```bash
# 安装依赖
npm install

# 使用 esbuild 构建 (输出带 shebang 的 dist/ccpet.js)
npm run build

# 可选: 作为全局/二进制文件链接以供本地使用
npm link
```

## 使用方法
有两种运行方式:

1) 无输入 (显示当前状态)
```bash
# 确保 stdin 已关闭 (重要), 否则进程将等待输入
node dist/ccpet.js < /dev/null
# 或者如果已链接:
ccpet < /dev/null
```

2) 使用 Claude Code 状态 JSON (从 stdin 读取)
```bash
# 最小 JSON 示例
cat << 'JSON' | node dist/ccpet.js
{
  "hook_event_name": "status",
  "session_id": "abc-123",
  "transcript_path": "/absolute/path/to/transcript.jsonl",
  "cwd": "/path/to/workspace",
  "model": { "id": "claude-3.5", "display_name": "Claude 3.5" },
  "workspace": { "current_dir": ".", "project_dir": "." },
  "version": "1",
  "output_style": { "name": "plain" },
  "cost": { "total_cost_usd": 0, "total_duration_ms": 0, "total_api_duration_ms": 0, "total_lines_added": 0, "total_lines_removed": 0 }
}
JSON
```
JSON 的 `transcript_path` 指向一个 Claude Code JSONL 转录文件。解析器按 `sessionId` 增量处理 token 使用情况，并在 `~/.claude-pet/session-tracker.json` 中保存一个追踪器。详见 `src/utils/jsonl.ts`。

## 输出示例
```text
(^_^) ●●●●●●●●●● 100.00 (0)
 In: 0 Out: 0 Cached: 0 Total: 0
```
- 第 1 行: 表情 + 10 字符能量条 + 能量值 (2 位小数) + 累计的 tokens
- 第 2 行: 会话总计 (输入/输出/缓存/总计)

## 配置
编辑 `src/core/config.ts` 以调整行为并重新构建:
- `INITIAL_ENERGY`: 默认为 100
- `STATE_THRESHOLDS`: `HAPPY:80`, `HUNGRY:40`, `SICK:10`, `DEAD:0`
- `STATE_EXPRESSIONS`: `(^_^)`, `(o_o)`, `(u_u)`, `(x_x)`
- `TIME_DECAY`: `DECAY_RATE: 0.0231` 能量/分钟, `DECAY_CHECK_INTERVAL: 60000ms`, `MINIMUM_DECAY_INTERVAL: 60000ms`
- `FEEDING`: `TOKENS_PER_ENERGY: 1000000`
- 能量条: `ENERGY_BAR_LENGTH: 10`, `FILLED_BAR_CHAR: '●'`, `EMPTY_BAR_CHAR: '○'`

## 持久化与数据文件
- 状态文件: `~/.claude-pet/pet-state.json`
  ```json
  {
    "energy": 77.23,
    "expression": "(o_o)",
    "lastFeedTime": "2025-08-22T14:00:00.000Z",
    "lastDecayTime": "2025-08-22T16:00:00.000Z",
    "totalTokensConsumed": 12345,
    "accumulatedTokens": 2500
  }
  ```
- 会话追踪: `~/.claude-pet/session-tracker.json` (按 `sessionId`), 详见 `src/utils/jsonl.ts`。

## 项目结构
```
src/
  core/
    Pet.ts           # 能量、衰减、表情逻辑
    config.ts        # 阈值、表情、衰减和喂养配置
  services/
    PetStorage.ts    # 在 ~/.claude-pet/pet-state.json 中读/写状态
  ui/
    StatusBar.ts     # 状态格式化和能量条渲染
  utils/
    jsonl.ts         # Claude Code JSONL 转录文件的增量解析器
  ccpet.ts       # CLI 入口: 读取 stdin JSON, 渲染状态, 保存状态

docs/
  stories/          # 功能故事 1.1–1.7
  qa/               # 手动验收测试 (例如, story-1.5, story-1.7)
```

## 文档与 QA
- 故事: `docs/stories/`
  - `1.5.emotional-expressions.md` (表情阈值)
  - `1.7.state-persistence.md` (状态保存/加载和启动衰减)
- 手动验收测试: `docs/qa/`
  - `story-1.5-manual-acceptance-tests.md`
  - `story-1.7-manual-acceptance-tests.md`

## 测试
```bash
# 运行所有测试 (Vitest)
npm test

# 仅运行单元测试
npm run test:unit

# 覆盖率 (阈值: 80% 行/分支/函数/语句)
npm run test:coverage
```

## 开发提示
- 在观察模式下构建: `npm run watch`
- 代码风格: Prettier (`.prettierrc.json`)
- TS 配置: `tsconfig.json`
- 打包器: `esbuild.config.js` (目标为 Node 20, 发出 shebang)

## 故障排查
- CLI 似乎永远在等待: 确保 stdin 关闭 (使用 `< /dev/null` 或管道一个空字符串)，以便应用进入“无输入”分支。
- 输出中的颜色: CLI 打印 ANSI 颜色; 对于纯文本输出，你可以在代码中构造 `StatusBarFormatter(true)` 用于测试。

## 许可证
待定。
