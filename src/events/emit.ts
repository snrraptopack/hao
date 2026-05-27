import { emit as runtimeEmit } from '../runtime/component';
import type { ComponentHandle } from '../runtime/types';

export function emit(handle: ComponentHandle, name: string, payload?: unknown): boolean {
  return runtimeEmit(handle, name, payload);
}
