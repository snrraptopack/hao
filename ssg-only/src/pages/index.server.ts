import { remote, getContext, getParams } from 'auwla/server';

export const getServerTime = remote.get(async () => {
  // Simulate database or API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return new Date().toISOString();
});
