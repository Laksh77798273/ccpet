# ccpet

[简体中文 / Chinese](README.zh-CN.md)

A minimal Node.js CLI that renders a virtual pet for the status line. The pet’s energy decays over time, increases when you consume tokens, and persists across sessions.

- Entry: `src/ccpet.ts` → builds to `dist/ccpet.js`
- Binary name (after linking): `ccpet`
- State file: `~/.claude-pet/pet-state.json`
- Session tracker: `~/.claude-pet/session-tracker.json`

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

## Requirements
- Node.js >= 20
- npm >= 9

## Install & Build
```bash
# install dependencies
npm install

# build with esbuild (outputs dist/ccpet.js with shebang)
npm run build

# optional: link as a global/bin for local usage
npm link
```

## Usage
There are two ways to run:

1) No input (show current status)
```bash
# ensure stdin is closed (important), otherwise the process will wait for input
node dist/ccpet.js < /dev/null
# or if you linked:
ccpet < /dev/null
```

2) With Claude Code status JSON (reads from stdin)
```bash
# minimal JSON example
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
The JSON’s `transcript_path` points to a Claude Code JSONL transcript. The parser processes token usage incrementally by `sessionId` and keeps a tracker in `~/.claude-pet/session-tracker.json`. See `src/utils/jsonl.ts`.

## Output Example
```text
(^_^) ●●●●●●●●●● 100.00 (0)
 In: 0 Out: 0 Cached: 0 Total: 0
```
- Line 1: expression + 10-char energy bar + energy value (2 decimals) + accumulated tokens
- Line 2: session totals (input/output/cached/total)

## Configuration
Edit `src/core/config.ts` to tune behavior and rebuild:
- `INITIAL_ENERGY`: default 100
- `STATE_THRESHOLDS`: `HAPPY:80`, `HUNGRY:40`, `SICK:10`, `DEAD:0`
- `STATE_EXPRESSIONS`: `(^_^)`, `(o_o)`, `(u_u)`, `(x_x)`
- `TIME_DECAY`: `DECAY_RATE: 0.0231` energy/min, `DECAY_CHECK_INTERVAL: 60000ms`, `MINIMUM_DECAY_INTERVAL: 60000ms`
- `FEEDING`: `TOKENS_PER_ENERGY: 1000000`
- Energy bar: `ENERGY_BAR_LENGTH: 10`, `FILLED_BAR_CHAR: '●'`, `EMPTY_BAR_CHAR: '○'`

## Persistence & Data Files
- State file: `~/.claude-pet/pet-state.json`
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
- Session tracker: `~/.claude-pet/session-tracker.json` (per `sessionId`), see `src/utils/jsonl.ts`.

## Project Structure
```
src/
  core/
    Pet.ts           # energy, decay, expression logic
    config.ts        # thresholds, expressions, decay & feeding configs
  services/
    PetStorage.ts    # read/write state in ~/.claude-pet/pet-state.json
  ui/
    StatusBar.ts     # status formatting & energy bar rendering
  utils/
    jsonl.ts         # incremental parser for Claude Code JSONL transcripts
  ccpet.ts       # CLI entry: reads stdin JSON, renders status, saves state

docs/
  stories/          # feature stories 1.1–1.7
  qa/               # manual acceptance tests (e.g., story-1.5, story-1.7)
```

## Documentation & QA
- Stories: `docs/stories/`
  - `1.5.emotional-expressions.md` (expression thresholds)
  - `1.7.state-persistence.md` (state save/load & startup decay)
- Manual acceptance tests: `docs/qa/`
  - `story-1.5-manual-acceptance-tests.md`
  - `story-1.7-manual-acceptance-tests.md`

## Testing
```bash
# run all tests (Vitest)
npm test

# run unit tests only
npm run test:unit

# coverage (thresholds: 80% lines/branches/functions/statements)
npm run test:coverage
```

## Development Tips
- Build in watch mode: `npm run watch`
- Code style: Prettier (`.prettierrc.json`)
- TS config: `tsconfig.json`
- Bundler: `esbuild.config.js` (targets Node 20, emits shebang)

## Troubleshooting
- CLI seems to wait forever: ensure stdin closes (use `< /dev/null` or pipe an empty string) so the app enters the "no input" branch.
- Colors in output: the CLI prints ANSI colors; for plain output you can construct `StatusBarFormatter(true)` in code for tests.

## License
TBD.
