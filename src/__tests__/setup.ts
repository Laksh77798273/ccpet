import { vi } from 'vitest';

// Globally suppress console.error during tests to avoid noise
// while still allowing error handling code to execute
const originalConsoleError = console.error;
console.error = vi.fn();

// If you need to see actual errors during debugging, uncomment this:
// console.error = (...args: any[]) => {
//   // Only log errors that aren't from our intentional test scenarios
//   const message = args[0];
//   if (typeof message === 'string' && (
//     message.includes('Pet feeding failed') ||
//     message.includes('Pet time decay failed') ||
//     message.includes('Failed to update status bar') ||
//     message.includes('Failed to register command') ||
//     message.includes('Failed to set up token counting') ||
//     message.includes('Failed to dispose resource') ||
//     message.includes('Failed to subscribe to pet updates') ||
//     message.includes('Failed to format pet display') ||
//     message.includes('Failed to generate energy bar') ||
//     message.includes('Failed to dispose StatusBar') ||
//     message.includes('Failed to activate Status Pet Extension')
//   )) {
//     // Suppress expected error messages from our error handling tests
//     return;
//   }
//   originalConsoleError.apply(console, args);
// };