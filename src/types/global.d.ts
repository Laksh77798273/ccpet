// Global type definitions for the ccpet project

declare global {
  interface Window {
    vscode?: {
      postMessage(message: { command: string; text: string }): void;
      commands?: {
        registerCommand(command: string, callback: () => void): void;
      };
    };
  }
}

export {};