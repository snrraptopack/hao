/**
 * @fileoverview Regression tests for the track/core.ts issue-registry fixes:
 *
 *  - B8: an aborted run settling late must not null the NEW run's controller
 *        (cancellation of the new run was silently lost).
 *  - B9: the promise overload of track() ignored cancellation and let stale
 *        settles overwrite a fresher run's state.
 *  - B13: global asyncFn tracks (router loaders) served STALE data on the
 *        2nd visit to a path and only re-ran on the 3rd.
 *
 * These tests operate at the registry/handle level: outside a component
 * setup, track() keys fall back to the `__global` namespace and the reactive
 * cell simply has no subscribers, so status transitions can be asserted
 * directly on the handle.
 */

import { describe, expect, test, beforeEach, vi } from 'vitest';
import { track, hydrateTrackState, __resetTrackRegistry } from '../../src/track';
import { getRegistry, makeKey } from '../../src/track/core';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A promise with manual settle controls, for deterministic timing. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('B8 — aborted run must not null the NEW run\'s controller', () => {
  beforeEach(() => {
    __resetTrackRegistry();
  });

  test('late settle of an aborted run leaves the new run cancellable and untouched', async () => {
    const a = deferred<string>();
    const b = deferred<string>();
    let abortedA = false;
    let abortedB = false;

    // Run A starts.
    track('op', async (signal) => {
      signal.addEventListener('abort', () => { abortedA = true; });
      return a.promise;
    });
    // Re-tracking the same name aborts run A and installs a fresh controller for run B.
    const handleB = track('op', async (signal) => {
      signal.addEventListener('abort', () => { abortedB = true; });
      return b.promise;
    });

    expect(abortedA).toBe(true);
    expect(handleB.status).toBe('pending');

    const key = makeKey('op');
    const controllerB = getRegistry().get(key)?.controller;
    expect(controllerB).not.toBeNull();

    // Run A's promise settles LATE, after its own abort.
    a.resolve('stale-A');
    await sleep(10);

    // A's settle must NOT have nulled B's controller, nor flipped B's status/value.
    expect(getRegistry().get(key)?.controller).toBe(controllerB);
    expect(handleB.status).toBe('pending');
    expect(handleB.value).toBeUndefined();

    // B can still be cancelled: the abort fires and the status goes idle.
    handleB.cancel();
    expect(abortedB).toBe(true);
    expect(handleB.status).toBe('idle');

    // B's own late settle after the cancel must not resurrect the track either.
    b.resolve('late-B');
    await sleep(10);
    expect(handleB.status).toBe('idle');
    expect(handleB.value).toBeUndefined();
  });

  test('late REJECTION of an aborted run does not clobber the new run', async () => {
    const a = deferred<string>();
    const b = deferred<string>();

    track('op-rej', async () => a.promise);
    const handleB = track('op-rej', async () => b.promise);

    a.reject(new Error('stale failure'));
    await sleep(10);

    expect(handleB.status).toBe('pending');
    expect(handleB.rejected).toBe(false);

    b.resolve('fresh-B');
    await sleep(10);
    expect(handleB.status).toBe('resolved');
    expect(handleB.value).toBe('fresh-B');
  });
});

describe('B9 — promise overload honours cancellation and ignores stale settles', () => {
  beforeEach(() => {
    __resetTrackRegistry();
  });

  test('stale promise settling after a same-name re-track does not overwrite the fresh run', async () => {
    const stale = deferred<string>();
    const fresh = deferred<string>();

    track('q', stale.promise);
    const handleFresh = track('q', fresh.promise);

    expect(handleFresh.status).toBe('pending');

    // The stale promise resolves AFTER being superseded by the re-track.
    stale.resolve('old-value');
    await sleep(10);

    // State must reflect the fresh run only.
    expect(handleFresh.status).toBe('pending');
    expect(handleFresh.value).toBeUndefined();

    fresh.resolve('new-value');
    await sleep(10);

    expect(handleFresh.status).toBe('resolved');
    expect(handleFresh.value).toBe('new-value');
  });

  test('stale promise rejecting after a re-track does not flip the fresh run to rejected', async () => {
    const stale = deferred<string>();
    const fresh = deferred<string>();

    track('q-rej', stale.promise);
    const handleFresh = track('q-rej', fresh.promise);

    stale.reject(new Error('old failure'));
    await sleep(10);

    expect(handleFresh.status).toBe('pending');
    expect(handleFresh.rejected).toBe(false);
    expect(handleFresh.reason).toBeUndefined();

    fresh.resolve('fresh-value');
    await sleep(10);
    expect(handleFresh.status).toBe('resolved');
    expect(handleFresh.value).toBe('fresh-value');
  });

  test('cancel() prevents a later settle from flipping the track to resolved', async () => {
    const d = deferred<string>();
    const handle = track('c', d.promise);

    expect(handle.status).toBe('pending');

    handle.cancel();
    expect(handle.status).toBe('idle');

    d.resolve('too-late');
    await sleep(10);

    // No resolved transition may happen after cancellation.
    expect(handle.status).toBe('idle');
    expect(handle.value).toBeUndefined();
  });

  test('cancel() of an anonymous track(promise) prevents a later resolved transition', async () => {
    const d = deferred<string>();
    const handle = track(d.promise);

    expect(handle.status).toBe('pending');

    handle.cancel();
    d.resolve('too-late');
    await sleep(10);

    expect(handle.status).toBe('idle');
    expect(handle.value).toBeUndefined();
  });
});

describe('B13 — global asyncFn track (router loader) re-runs on every call', () => {
  beforeEach(() => {
    __resetTrackRegistry();
  });

  test('every track(name, asyncFn, opts, true) call re-runs the fn and updates the value', async () => {
    let runs = 0;
    // Mirrors Router.tsx startLoader(): track('__loader:' + path, fn, opts, true).
    const loader = vi.fn(async (_signal: AbortSignal) => {
      runs++;
      return `data-${runs}`;
    });

    // 1st visit: runs.
    const first = track('__loader:/posts', loader, undefined, true);
    await sleep(10);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(first.status).toBe('resolved');
    expect(first.value).toBe('data-1');

    // 2nd visit to the same path: must re-run (was the stale-serve-once bug).
    const second = track('__loader:/posts', loader, undefined, true);
    expect(loader).toHaveBeenCalledTimes(2);
    await sleep(10);
    expect(second.status).toBe('resolved');
    expect(second.value).toBe('data-2');

    // 3rd visit: still re-runs.
    const third = track('__loader:/posts', loader, undefined, true);
    expect(loader).toHaveBeenCalledTimes(3);
    await sleep(10);
    expect(third.status).toBe('resolved');
    expect(third.value).toBe('data-3');
  });

  test('SSR-hydrated loader entries are still served once without re-running', async () => {
    // Seed the registry the way hydrateTrackState does from window.__AUWLA_DATA__.
    hydrateTrackState({ '__loader:/hydrated': { from: 'server' } });

    const loader = vi.fn(async (_signal: AbortSignal) => 'client-fetch');

    // First client render after hydration serves the seeded server value.
    const first = track('__loader:/hydrated', loader, undefined, true);
    expect(loader).not.toHaveBeenCalled();
    expect(first.status).toBe('resolved');
    expect(first.value).toEqual({ from: 'server' });

    // Every subsequent visit re-runs the loader normally.
    const second = track('__loader:/hydrated', loader, undefined, true);
    expect(loader).toHaveBeenCalledTimes(1);
    await sleep(10);
    expect(second.status).toBe('resolved');
    expect(second.value).toBe('client-fetch');
  });
});
