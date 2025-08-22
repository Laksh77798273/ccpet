# ccpet

[![npm version](https://badge.fury.io/js/ccpet.svg)](https://badge.fury.io/js/ccpet)
[![Downloads](https://img.shields.io/npm/dm/ccpet.svg)](https://www.npmjs.com/package/ccpet)
[![Node.js CI](https://github.com/terryso/ccpet/workflows/CI/badge.svg)](https://github.com/terryso/ccpet/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[简体中文 / Chinese](README.zh-CN.md)

A virtual pet for your Claude Code status line. The pet's energy decays over time, increases when you consume tokens, and persists across sessions.


## Features
- Energy model with decay and feeding
  - Time-based decay (~0.0231 per minute, ~3 days from 100 → 0)
  - Feeding via token usage (1,000,000 tokens = +1 energy)
- Expressions by thresholds (from `src/core/config.ts`)
  - `HAPPY (>=80)`: `(^_^)`
  - `HUNGRY (>=40)`: `(o_o)`
  - `SICK (>=10)`: `(u_u)`
  - `DEAD (<10)`: `(x_x)`
- Status output (colored): expression + energy bar + energy value + accumulated tokens
- Session metrics line: input / output / cached / total tokens
- Persistent state across sessions

## Installation & Setup

To use ccpet as your Claude Code status line, add the following configuration to your `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx ccpet@latest",
    "padding": 0
  }
}
```

After configuration, a cute virtual pet will appear in your Claude Code status line, updating its status in real-time based on your token usage.

## Output Example

```text
(o_o) ●●●●●●●○○○ 67.43 (125K)
 In: 2847 Out: 1256 Cached: 512 Total: 4615
```

- Line 1: expression + 10-char energy bar + energy value (2 decimals) + pending tokens to convert
- Line 2: session totals (input/output/cached/total)

## Pet Care

If your pet dies (shows `(x_x)` with energy < 10), you can revive it by using Claude Code actively. Each token you consume will help restore your pet's energy. The more you use Claude Code, the faster your pet will recover!

**When your pet's energy drops to 0**: Your pet will completely die and all token statistics (totalLifetimeTokens, totalTokensConsumed, accumulatedTokens) will be reset to zero. To start over, simply continue using Claude Code - each new token you consume will begin building up your new pet from scratch!

## License

MIT License
