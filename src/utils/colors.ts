/**
 * Color utility functions for converting hex colors to ANSI escape codes
 */

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Detect if terminal supports true color (24-bit RGB)
 */
function supportsTrueColor(): boolean {
  const colorTerm = process.env.COLORTERM;
  const term = process.env.TERM;
  
  // Check for explicit true color support
  if (colorTerm === 'truecolor' || colorTerm === '24bit') {
    return true;
  }
  
  // Check for terminals known to support true color
  if (term) {
    const knownTrueColorTerms = [
      'iterm',
      'iterm2', 
      'alacritty',
      'kitty',
      'wezterm'
    ];
    
    if (knownTrueColorTerms.some(t => term.toLowerCase().includes(t))) {
      return true;
    }
    
    // Check for xterm-256color with newer versions
    if (term.includes('256color')) {
      return true;
    }
  }
  
  // Check Windows Terminal
  if (process.env.WT_SESSION) {
    return true;
  }
  
  // Conservative fallback to 256 colors
  return false;
}

/**
 * Convert hex color (e.g., "#FF0000" or "FF0000") to RGB values
 */
function hexToRgb(hex: string): RGBColor {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * Find the closest ANSI 256-color code for given RGB values
 */
function rgbToAnsi256(r: number, g: number, b: number): number {
  // Handle standard colors (0-15)
  const standardColors = [
    { r: 0, g: 0, b: 0 },       // 0: black
    { r: 128, g: 0, b: 0 },     // 1: dark red
    { r: 0, g: 128, b: 0 },     // 2: dark green
    { r: 128, g: 128, b: 0 },   // 3: dark yellow
    { r: 0, g: 0, b: 128 },     // 4: dark blue
    { r: 128, g: 0, b: 128 },   // 5: dark magenta
    { r: 0, g: 128, b: 128 },   // 6: dark cyan
    { r: 192, g: 192, b: 192 }, // 7: light gray
    { r: 128, g: 128, b: 128 }, // 8: dark gray
    { r: 255, g: 0, b: 0 },     // 9: red
    { r: 0, g: 255, b: 0 },     // 10: green
    { r: 255, g: 255, b: 0 },   // 11: yellow
    { r: 0, g: 0, b: 255 },     // 12: blue
    { r: 255, g: 0, b: 255 },   // 13: magenta
    { r: 0, g: 255, b: 255 },   // 14: cyan
    { r: 255, g: 255, b: 255 }  // 15: white
  ];

  let closestColor = 0;
  let minDistance = Infinity;

  // Check standard colors first
  for (let i = 0; i < standardColors.length; i++) {
    const color = standardColors[i];
    const distance = Math.sqrt(
      Math.pow(r - color.r, 2) +
      Math.pow(g - color.g, 2) +
      Math.pow(b - color.b, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = i;
    }
  }

  // Check 216 color cube (16-231)
  for (let i = 0; i < 216; i++) {
    const colorIndex = 16 + i;
    const red = Math.floor(i / 36) * 51;
    const green = Math.floor((i % 36) / 6) * 51;
    const blue = (i % 6) * 51;
    
    const distance = Math.sqrt(
      Math.pow(r - red, 2) +
      Math.pow(g - green, 2) +
      Math.pow(b - blue, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = colorIndex;
    }
  }

  // Check grayscale colors (232-255)
  for (let i = 0; i < 24; i++) {
    const colorIndex = 232 + i;
    const gray = 8 + i * 10;
    
    const distance = Math.sqrt(
      Math.pow(r - gray, 2) +
      Math.pow(g - gray, 2) +
      Math.pow(b - gray, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = colorIndex;
    }
  }

  return closestColor;
}

/**
 * Convert RGB values to true color ANSI escape code
 */
function rgbToTrueColor(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Convert hex color to ANSI escape code with automatic true color detection
 */
export function hexToAnsi(hex: string, bright: boolean = false, bold: boolean = false): string {
  if (hex === 'RESET') {
    return '\x1b[0m';
  }

  const { r, g, b } = hexToRgb(hex);
  
  // Use true color if supported
  if (supportsTrueColor()) {
    const colorCode = rgbToTrueColor(r, g, b);
    return bold ? `\x1b[1m${colorCode}` : colorCode;
  }
  
  // Fallback to 256 color mode
  const ansiColor = rgbToAnsi256(r, g, b);
  
  if (bright && ansiColor < 8) {
    // Convert to bright version (8-15) for standard colors
    return `\x1b[1;3${ansiColor}m`;
  }
  
  const colorCode = `\x1b[38;5;${ansiColor}m`;
  return bold ? `\x1b[1m${colorCode}` : colorCode;
}

/**
 * Process color configuration object, converting hex values to ANSI codes
 */
export function processColorConfig(colors: Record<string, string>): Record<string, string> {
  const processed: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(colors)) {
    if (key === 'RESET') {
      processed[key] = '\x1b[0m';
    } else {
      // Check if value contains modifiers (format: "hex:bright:bold" or "hex:bright" or just "hex")
      const parts = value.split(':');
      const hex = parts[0];
      const bright = parts.includes('bright');
      const bold = parts.includes('bold');
      
      processed[key] = hexToAnsi(hex, bright, bold);
    }
  }
  
  return processed;
}