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

export { emit } from './emit';
export { DEFAULT_EVENT_DELAY_MS } from './timing';
