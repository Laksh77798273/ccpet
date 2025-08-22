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
  TIME_DECAY: {
    DECAY_CHECK_INTERVAL: 60000, // 1 minute in milliseconds
    DECAY_RATE: 0.0231, // energy points to decrease per minute (~3 day 100→0 rate)
    MINIMUM_DECAY_INTERVAL: 60000 // minimum 1 minute before first decay can occur
  },
  FEEDING: {
    TOKENS_PER_ENERGY: 1000000 // 100万token = 1点能量
  }
} as const;

export const LOGGER_CONFIG = {
  COMPONENT_NAME: 'StatusPetExtension'
} as const;

