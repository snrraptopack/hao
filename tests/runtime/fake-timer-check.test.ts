import { test, expect, vi } from 'vitest';

test('fake timers intercept setTimeout', () => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });
  let called = false;
  setTimeout(() => { called = true; }, 16);
  vi.advanceTimersByTime(16);
  expect(called).toBe(true);
  vi.useRealTimers();
});
