import { describe, it, expect } from 'vitest';
import { effect, runComponentEffects, clearComponentEffects } from '../../src/runtime/computed';
import { runtimeState } from '../../src/runtime/state';

describe('__effect runtime', () => {
  it('registers and runs effects for a component', () => {
    const ownerId = 'test-component';
    runtimeState.activeSetupComponentId = ownerId;

    let runs = 0;
    effect(() => {
      runs++;
    });

    expect(runs).toBe(1); // effect runs once during setup

    runComponentEffects(ownerId);
    expect(runs).toBe(2);

    runComponentEffects(ownerId);
    expect(runs).toBe(3);

    runtimeState.activeSetupComponentId = null;
    clearComponentEffects(ownerId);
  });

  it('does not run effects for other components', () => {
    const ownerId = 'test-component-2';
    runtimeState.activeSetupComponentId = ownerId;

    let runs = 0;
    effect(() => {
      runs++;
    });

    expect(runs).toBe(1); // ran during setup

    runComponentEffects('other-component');
    expect(runs).toBe(1);

    runComponentEffects(ownerId);
    expect(runs).toBe(2);

    runtimeState.activeSetupComponentId = null;
    clearComponentEffects(ownerId);
  });
});
