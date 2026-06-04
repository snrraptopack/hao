import { reactive } from 'auwla';

export const reactiveTheme = reactive('light');
export let plainTheme = 'light';

export function togglePlain() {
  plainTheme = plainTheme === 'light' ? 'dark' : 'light';
  console.log('--- Plain Theme Updated ---');
  console.log('Plain Theme value in store:    ', plainTheme);
  console.log('Reactive Theme value in store: ', reactiveTheme.get());
}

export function toggleReactive() {
  const nextTheme = reactiveTheme.get() === 'light' ? 'dark' : 'light';
  reactiveTheme.set(nextTheme);
  console.log('--- Reactive Theme Updated ---');
  console.log('Plain Theme value in store:    ', plainTheme);
  console.log('Reactive Theme value in store: ', reactiveTheme.get());
}
