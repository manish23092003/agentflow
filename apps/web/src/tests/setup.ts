/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, afterEach } from 'vitest';
(globalThis as any).expect = expect;
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
