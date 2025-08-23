import { processColorConfig } from '../utils/colors';

// Raw color configuration using hex values
// Users can easily modify these hex colors using standard format like #CC00FF
// Add ":bright" suffix for bright colors (e.g., "#FFFFFF:bright")
const RAW_COLORS = {
  PET_EXPRESSION: '#FFFF00:bright:bold', // bright yellow and bold
  ENERGY_BAR: '#00FF00', // green
  ENERGY_VALUE: '#00FFFF', // blue
  ACCUMULATED_TOKENS: '#778899', // cyan
  LIFETIME_TOKENS: '#FF00FF', // magenta
  SESSION_INPUT: '#00FF00', // green
  SESSION_OUTPUT: '#FFFF00', // yellow
  SESSION_CACHED: '#F4A460', // cyan
  SESSION_TOTAL: '#FFFFFF', // white
  RESET: 'RESET' // reset color
} as const;

export const PET_CONFIG = {
  INITIAL_ENERGY: 100,
  HAPPY_EXPRESSION_THRESHOLD: 80,
  HAPPY_EXPRESSION: '(^_^)',
  ENERGY_BAR_LENGTH: 10,
  STATUS_BAR_PRIORITY: 100,
  FILLED_BAR_CHAR: '●',
  EMPTY_BAR_CHAR: '○',
  STATE_THRESHOLDS: {
    HAPPY: 80,
    HUNGRY: 40,
    SICK: 10,
    DEAD: 0
  },
  STATE_EXPRESSIONS: {
    HAPPY: '(^_^)',
    HUNGRY: '(o_o)',
    SICK: '(u_u)',
    DEAD: '(x_x)'
  },
  // 动画表情序列
  ANIMATED_EXPRESSIONS: {
    HAPPY: ['(^_^)', '(^o^)', '(^_^)', '(^v^)'],
    HUNGRY: ['(o_o)', '(O_O)', '(o_o)', '(-_-)'],
    SICK: ['(u_u)', '(T_T)', '(u_u)', '(>_<)'],
    DEAD: ['(x_x)', '(X_X)', '(x_x)', '(+_+)']
  },
  TIME_DECAY: {
    DECAY_CHECK_INTERVAL: 60000, // 1 minute in milliseconds
    DECAY_RATE: 0.0231, // energy points to decrease per minute (~3 day 100→0 rate)
    MINIMUM_DECAY_INTERVAL: 60000 // minimum 1 minute before first decay can occur
  },
  FEEDING: {
    TOKENS_PER_ENERGY: 1000000 // 100万token = 1点能量
  },
  // Processed colors - automatically converted from hex to ANSI escape codes
  COLORS: processColorConfig(RAW_COLORS as Record<string, string>)
} as const;

export const LOGGER_CONFIG = {
  COMPONENT_NAME: 'StatusPetExtension'
} as const;

