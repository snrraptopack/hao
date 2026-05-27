import { test } from 'vitest';
test('raf check', () => {
  console.log('raf:', typeof requestAnimationFrame);
});
