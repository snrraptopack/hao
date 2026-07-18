import { trackImpl } from './core';
import { trackGet, trackPost } from './remote';
import { trackForm } from './form';
import type { TrackHandle, TrackOptions } from './core';

export { pending, resolved, rejected, value, reason, cancel, __resetTrackRegistry, __extractTrackState, hydrateTrackState, hasPendingLoaders } from './core';

export type {
  TrackStatus,
  TrackOptions,
  TrackHandle,
} from './core';
export type {
  TrackRemoteOptions,
  CommandHandle,
} from './remote';

export type { FormHandle, FormOptions } from './form';

export interface TrackFn {
  (name: string, promise: Promise<unknown>, options?: TrackOptions, isGlobal?: boolean): TrackHandle;
  (name: string, fn: (signal: AbortSignal) => Promise<unknown>, options?: TrackOptions, isGlobal?: boolean): TrackHandle;
  (promise: Promise<unknown>, options?: TrackOptions, isGlobal?: boolean): TrackHandle;
  get: typeof trackGet;
  post: typeof trackPost;
  form: typeof trackForm;
}

export const track: TrackFn = Object.assign(trackImpl, {
  get: trackGet,
  post: trackPost,
  form: trackForm,
});

