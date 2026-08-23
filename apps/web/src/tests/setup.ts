/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, afterEach, vi } from 'vitest';
(globalThis as any).expect = expect;
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);

// Mock @perawallet/connect globally for tests
(globalThis as any).__mockPera = {
  connect: vi.fn().mockResolvedValue([]),
  disconnect: vi.fn().mockResolvedValue(undefined),
  reconnectSession: vi.fn().mockResolvedValue([]),
  signTransaction: vi.fn().mockResolvedValue([new Uint8Array([1, 2, 3])]),
};

vi.mock('@perawallet/connect', () => {
  return {
    PeraWalletConnect: vi.fn().mockImplementation(() => ({
      connect: (...args: any[]) => (globalThis as any).__mockPera.connect(...args),
      disconnect: (...args: any[]) => (globalThis as any).__mockPera.disconnect(...args),
      reconnectSession: (...args: any[]) => (globalThis as any).__mockPera.reconnectSession(...args),
      signTransaction: (...args: any[]) => (globalThis as any).__mockPera.signTransaction(...args),
      connector: {
        on: vi.fn(),
      }
    }))
  };
});

let store: Record<string, string> = {};
const mockStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = String(value); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { store = {}; },
  key: (index: number) => Object.keys(store)[index] || null,
  get length() { return Object.keys(store).length; }
} as Storage;

globalThis.localStorage = mockStorage;
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true
  });
}

// Mock canvas getContext for lottie-web in jsdom
if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = (() => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  })) as any;
}

if (!globalThis.fetch) {
  (globalThis as any).fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/auth/me')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          user: {
            id: 'mock-user-id',
            email: 'researcher@agentflow.ai',
            name: 'Demo Researcher',
            avatarUrl: null,
            createdAt: new Date().toISOString()
          },
          wallets: []
        })
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({})
    });
  });
}

afterEach(() => {
  cleanup();
});

