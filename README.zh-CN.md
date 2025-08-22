# ccpet

[![npm version](https://badge.fury.io/js/ccpet.svg)](https://badge.fury.io/js/ccpet)
[![Downloads](https://img.shields.io/npm/dm/ccpet.svg)](https://www.npmjs.com/package/ccpet)
[![Node.js CI](https://github.com/terryso/ccpet/workflows/CI/badge.svg)](https://github.com/terryso/ccpet/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](README.md)

一个 Claude Code 状态栏虚拟宠物。宠物的能量会随时间衰减、在你消耗 token 时增加，并在会话之间持久化保存。

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

## 安装和配置

要将 ccpet 用作你的 Claude Code 状态栏，请在你的 `~/.claude/settings.json` 文件中添加以下配置：

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx ccpet@latest",
    "padding": 0 
  }
}
```

配置完成后，你的 Claude Code 状态栏就会显示一个可爱的虚拟宠物，它会根据你的 token 使用情况实时更新状态。

## 输出示例

```text
(o_o) ●●●●●●●○○○ 67.43 (125K)
 In: 2847 Out: 1256 Cached: 512 Total: 4615
```

- 第 1 行: 表情 + 10 字符能量条 + 能量值 (2 位小数) + 待转化的 token数
- 第 2 行: 会话总计 (输入/输出/缓存/总计)

## 宠物照顾

如果你的宠物死了（显示 `(x_x)` 且能量 < 10），你可以通过积极使用 Claude Code 来复活它。你消耗的每个 token 都会帮助恢复宠物的能量。使用 Claude Code 越多，宠物恢复得越快！

**当宠物能量降到 0 时**：你的宠物会完全死亡，所有 token 统计数据（totalLifetimeTokens、totalTokensConsumed、accumulatedTokens）都会重置为零。要重新开始，只需继续使用 Claude Code - 你消耗的每个新 token 都会从头开始培养你的新宠物！

## 许可证

MIT License
