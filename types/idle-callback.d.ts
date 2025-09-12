// src/types/idle-callback.d.ts
export {};

declare global {
  type IdleRequestCallback = (deadline: {
    readonly didTimeout: boolean;
    timeRemaining: () => number;
  }) => void;

  interface Window {
    requestIdleCallback?: (cb: IdleRequestCallback, options?: { timeout?: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  }
}
