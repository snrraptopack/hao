import { createEventChain } from './chain';

export const event = createEventChain();

export type {
  EventChain,
  EventModifier,
  LogEventChain,
  RuntimeEventHandler,
  TimedEventChain,
  WrappedEventHandler,
} from './types';

export { emit } from './emit';
export { DEFAULT_EVENT_DELAY_MS } from './timing';
