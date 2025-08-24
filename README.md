# ccpet

[![npm version](https://badge.fury.io/js/ccpet.svg)](https://badge.fury.io/js/ccpet)
[![Downloads](https://img.shields.io/npm/dm/ccpet.svg)](https://www.npmjs.com/package/ccpet)
[![Node.js CI](https://github.com/terryso/ccpet/workflows/CI/badge.svg)](https://github.com/terryso/ccpet/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[简体中文 / Chinese](README.zh-CN.md)

A virtual pet for your Claude Code status line. The pet's energy decays over time, increases when you consume tokens, and persists across sessions.

## Features

- **🐾 Virtual Pet System**
  - Energy-based pet that responds to your Claude Code usage
  - Time-based decay (~0.0231 per minute, ~3 days from 100 → 0)
  - Feeding via token usage (1,000,000 tokens = +1 energy)
  
- **🎭 Animated Expressions** based on energy levels
  - **HAPPY (≥80)**: `(^_^) (^o^) (^_^) (^v^)` - Your pet is thriving!
  - **HUNGRY (≥40)**: `(o_o) (O_O) (o_o) (-_-)` - Needs some attention
  - **SICK (≥10)**: `(u_u) (T_T) (u_u) (>_<)` - Time to feed your pet
  - **DEAD (<10)**: `(x_x) (X_X) (x_x) (+_+)` - Your pet needs urgent care!

- **📊 Rich Status Display**
  - Colorful energy bar with precise energy values
  - Accumulated tokens and lifetime statistics
  - Real-time session metrics (input/output/cached/total)
  
- **⚙️ Configurable & Persistent**
  - Customizable colors and decay rates
  - State persists across Claude Code sessions

## Installation & Setup

### Quick Start
To use ccpet as your Claude Code status line, add this to your `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx ccpet@latest",
    "padding": 0
  }
}
```

### Alternative: Global Installation
For better performance, you can install globally:

```bash
npm install -g ccpet
```

Then update your settings to use the global path.

## CLI Commands

### Basic Usage
```bash
ccpet                    # Show status line (for Claude Code)
ccpet --help             # Show help information
ccpet --version          # Show version number
```

### Pet Management Commands

#### Check Command
```bash
ccpet check              # Manually check pet status (no token cost)
```
Use `ccpet check` to:
- ✅ Check pet status without consuming tokens
- ✅ See time since last feeding
- ✅ Monitor energy levels between sessions

#### Configuration Command
```bash
ccpet config list        # Show current configuration
ccpet config set <key> <value>  # Set configuration value
ccpet config reset       # Reset to default configuration
ccpet config path        # Show configuration file location
```

**Configuration Options:**
```bash
# Colors (format: #RRGGBB or #RRGGBB:bright or #RRGGBB:bright:bold)
ccpet config set colors.petExpression "#FF0000:bright:bold"
ccpet config set colors.energyBar "#00FF00"
ccpet config set colors.energyValue "#00FFFF"
ccpet config set colors.lifetimeTokens "#FF00FF"

# Pet behavior
ccpet config set pet.animationEnabled true
ccpet config set pet.decayRate 0.0231
```

## Status Display

### Normal Operation
```text
(^o^) ●●●●●●●●●● 98.52 (45.2K) 💖5.2M
In: 2847 Out: 1256 Cached: 512 Total: 4615
```

### Low Energy
```text
(u_u) ●●○○○○○○○○ 15.32 (890.1K) 💖12.3M
In: 5234 Out: 3421 Cached: 1024 Total: 9679
```

**Status Format:**
- **Line 1**: `[expression] [energy_bar] [energy_value] ([accumulated_tokens]) 💖[lifetime_tokens]`
- **Line 2**: `In: [input] Out: [output] Cached: [cached] Total: [session_total]`

## Pet Care Guide

### 🌟 Keeping Your Pet Healthy
- **Active Usage**: Use Claude Code regularly to feed your pet
- **Token Conversion**: 1,000,000 tokens = +1 energy point
- **Natural Decay**: ~0.0231 energy per minute (~3 days to fully decay)

### 😴 When Your Pet Dies
If your pet's energy reaches 0:
- All statistics are reset (lifetime tokens, accumulated tokens)
- Your pet can be revived by continued Claude Code usage
- Each new token helps rebuild your pet from scratch

## Troubleshooting

### Status Line Not Updating?
The status line only updates when you use Claude Code. Use `ccpet check` for manual updates.

### Pet Disappeared?
1. Check Claude Code settings: `cat ~/.claude/settings.json`
2. Verify ccpet installation: `ccpet --version`
3. Test manually: `ccpet check`

## Development

### Testing
```bash
npm test              # Run all tests
npm run test:coverage # Run tests with coverage report
```

### Building
```bash
npm run build        # Build distribution files
npm run watch        # Build and watch for changes
```

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=terryso/ccpet&type=Date)](https://www.star-history.com/#terryso/ccpet&Date)

## License

MIT License

---

**Enjoy your virtual coding companion! 🐾**

*Remember: A well-fed pet is a happy pet. Keep coding to keep your pet healthy!*
