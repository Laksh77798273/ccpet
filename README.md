# ccpet

[![npm version](https://badge.fury.io/js/ccpet.svg)](https://badge.fury.io/js/ccpet)
[![Downloads](https://img.shields.io/npm/dm/ccpet.svg)](https://www.npmjs.com/package/ccpet)
[![Node.js CI](https://github.com/terryso/ccpet/workflows/CI/badge.svg)](https://github.com/terryso/ccpet/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[简体中文 / Chinese](README.zh-CN.md)

A virtual pet for your Claude Code status line. The pet's energy decays over time, increases when you consume tokens, and persists across sessions.


## Features
- **Energy model** with decay and feeding
  - Time-based decay (~0.0231 per minute, ~3 days from 100 → 0)
  - Feeding via token usage (1,000,000 tokens = +1 energy)
- **Animated expressions** based on energy levels with continuous cycling
  - Expressions automatically cycle through 4-frame animations
  - No frame rate detection - simple counter-based animation system
- **Expression states** by thresholds (from `src/core/config.ts`)
  - `HAPPY (>=80)`: Static `(^_^)` → Animated `(^_^) (^o^) (^_^) (^v^)`
  - `HUNGRY (>=40)`: Static `(o_o)` → Animated `(o_o) (O_O) (o_o) (-_-)`
  - `SICK (>=10)`: Static `(u_u)` → Animated `(u_u) (T_T) (u_u) (>_<)`
  - `DEAD (<10)`: Static `(x_x)` → Animated `(x_x) (X_X) (x_x) (+_+)`
- **Simple animation system**
  - Counter-based animation cycling with persistent state
  - Performance optimized with call-count tracking
  - Continuous 4-frame animation loops for each energy state
- **Status output** (colored): expression + energy bar + energy value + accumulated tokens
- **Session metrics** line: input / output / cached / total tokens
- **Persistent state** across sessions

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

## Output Examples

### Static Mode (Low Frequency)
```text
(o_o) ●●●●●●●○○○ 67.43 (125K) 💖2.1M
 In: 2847 Out: 1256 Cached: 512 Total: 4615
```

### Animated Mode (Continuous)
Your pet continuously cycles through animated expressions based on energy level:
```text
(^o^) ●●●●●●●●●● 98.52 (45K) 💖5.2M    # Frame 1
(^_^) ●●●●●●●●●● 98.52 (45K) 💖5.2M    # Frame 2  
(^v^) ●●●●●●●●●● 98.52 (45K) 💖5.2M    # Frame 3
(^_^) ●●●●●●●●●● 98.52 (45K) 💖5.2M    # Frame 4
```

**Format:**
- Line 1: expression + 10-char energy bar + energy value (2 decimals) + pending tokens to convert + lifetime tokens consumed
- Line 2: session totals (input/output/cached/total)

## Pet Care

If your pet dies (shows `(x_x)` with energy < 10), you can revive it by using Claude Code actively. Each token you consume will help restore your pet's energy. The more you use Claude Code, the faster your pet will recover!

**When your pet's energy drops to 0**: Your pet will completely die and all token statistics (totalLifetimeTokens, totalTokensConsumed, accumulatedTokens) will be reset to zero. To start over, simply continue using Claude Code - each new token you consume will begin building up your new pet from scratch!

## Manual Pet Status Check

Want to check on your pet without using Claude Code? Use the manual check command:

```bash
npx ccpet-check
```

This command:
- ✅ Shows your pet's current status with real-time decay applied
- ✅ **Does NOT consume Claude Code tokens**
- ✅ Displays time since last feeding
- ✅ Perfect for checking if your pet needs attention

**Why isn't the status line updated automatically?**
The Claude Code status line only updates when you actively use Claude Code. This is by design to avoid consuming your tokens unnecessarily. The manual check command gives you a way to peek at your pet's status anytime without token cost!

## License

MIT License
