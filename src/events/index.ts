import './intersect';
import './touch';
import { createEventChain } from './chain';

export const event = createEventChain();

export type {
  EventChain,
  EventCondition,
  EventModifier,
  EventTargetFilter,
  LogEventChain,
  RuntimeEventHandler,
  TargetEventChain,
  TimedEventChain,
  WrappedEventHandler,
} from './types';

// TrackHandle is part of the public API so router and userland can type
// loader handles without importing from internal paths.
export type { TrackHandle, TrackStatus } from './track';

export { emit } from './emit';
export { DEFAULT_EVENT_DELAY_MS } from './timing';
