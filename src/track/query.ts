/**
 * @fileoverview Global query API for track: inspect or cancel tracked
 * operations from anywhere (render closures, event handlers, other modules).
 */

import {
  cancelTrackState,
  cleanupComponentTracks,
  getComponentId,
  getRegistry,
  makeKey,
} from './registry';

export function pending(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of getRegistry()) {
      if (key.startsWith(`${cid}::`) && state.statusCell.get() === 'pending') return true;
    }
    return false;
  }
  const state = getRegistry().get(makeKey(name));
  return state?.statusCell.get() === 'pending';
}

/** Return whether a named track (or any track if no name given) has resolved. */
export function resolved(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of getRegistry()) {
      if (key.startsWith(`${cid}::`) && state.statusCell.get() === 'resolved') return true;
    }
    return false;
  }
  const state = getRegistry().get(makeKey(name));
  return state?.statusCell.get() === 'resolved';
}

/** Return whether a named track (or any track if no name given) has rejected. */
export function rejected(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of getRegistry()) {
      if (key.startsWith(`${cid}::`) && state.statusCell.get() === 'rejected') return true;
    }
    return false;
  }
  const state = getRegistry().get(makeKey(name));
  return state?.statusCell.get() === 'rejected';
}

/** Return the resolved value of a named track. */
export function value<T = unknown>(name: string): T | undefined {
  const state = getRegistry().get(makeKey(name));
  return state?.statusCell.get() === 'resolved' ? (state.value as T) : undefined;
}

/** Return the rejection reason of a named track. */
export function reason(name: string): unknown {
  const state = getRegistry().get(makeKey(name));
  return state?.statusCell.get() === 'rejected' ? state.reason : undefined;
}

/** Cancel a named track (or all tracks for the current component if no name). */
export function cancel(name?: string): void {
  if (name === undefined) {
    const cid = getComponentId();
    if (cid) cleanupComponentTracks(cid);
    return;
  }
  const key = makeKey(name);
  cancelTrackState(getRegistry().get(key));
}
