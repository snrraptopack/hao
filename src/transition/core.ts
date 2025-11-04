/**
 * Core transition system for Auwla
 * CSS-based transitions with interruption handling
 */

export type EasingFunction = string | ((t: number) => number);

export interface TransitionConfig {
  duration?: number;
  delay?: number;
  easing?: EasingFunction;
  css?: (t: number, u: number) => string;
  tick?: (t: number, u: number) => void;
}

export interface TransitionFn {
  (node: HTMLElement, config?: any): TransitionConfig;
}

export type TransitionState = 'entering' | 'entered' | 'exiting' | 'exited';

interface TransitionInstance {
  state: TransitionState;
  animation?: Animation;
  cleanup?: () => void;
}

const instances = new WeakMap<HTMLElement, TransitionInstance>();

/**
 * Parse CSS string into keyframe object for Web Animations API
 */
function parseCSSToKeyframe(css: string): Keyframe {
  const keyframe: Keyframe = {};
  const rules = css.split(';').filter(r => r.trim());
  
  for (const rule of rules) {
    const colonIndex = rule.indexOf(':');
    if (colonIndex === -1) continue;
    
    const prop = rule.substring(0, colonIndex).trim();
    const value = rule.substring(colonIndex + 1).trim();
    
    if (prop && value) {
      // Convert kebab-case to camelCase for Web Animations API
      const camelProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      keyframe[camelProp] = value;
    }
  }
  
  return keyframe;
}

/**
 * Apply enter transition to element
 */
export function enter(
  element: HTMLElement,
  transition: TransitionFn,
  config?: any
): Promise<void> {
  return new Promise((resolve) => {
    // Cancel any existing transition
    const existing = instances.get(element);
    if (existing?.animation) {
      existing.animation.cancel();
    }

    const transitionConfig = transition(element, config);
    const duration = transitionConfig.duration || 300;
    const delay = transitionConfig.delay || 0;
    const easing = typeof transitionConfig.easing === 'string' 
      ? transitionConfig.easing 
      : 'ease-out';

    instances.set(element, { state: 'entering' });

    // If custom css function provided, use it
    if (transitionConfig.css) {
      const keyframes: Keyframe[] = [];
      const steps = 60; // 60fps
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        const css = transitionConfig.css(t, u);
        keyframes.push(parseCSSToKeyframe(css));
      }

      const animation = element.animate(keyframes, {
        duration,
        delay,
        easing: easing as string,
        fill: 'forwards'
      });

      const instance = instances.get(element)!;
      instance.animation = animation;

      animation.onfinish = () => {
        instance.state = 'entered';
        instance.animation = undefined;
        resolve();
      };

      return;
    }

    // If tick function provided, use it
    if (transitionConfig.tick) {
      const startTime = Date.now() + delay;
      const endTime = startTime + duration;

      const tick = () => {
        const now = Date.now();
        if (now < startTime) {
          requestAnimationFrame(tick);
          return;
        }

        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const u = 1 - t;

        transitionConfig.tick!(t, u);

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          const instance = instances.get(element)!;
          instance.state = 'entered';
          resolve();
        }
      };

      requestAnimationFrame(tick);
      return;
    }

    // Fallback: immediate
    const instance = instances.get(element)!;
    instance.state = 'entered';
    resolve();
  });
}

/**
 * Apply exit transition to element
 */
export function exit(
  element: HTMLElement,
  transition: TransitionFn,
  config?: any
): Promise<void> {
  return new Promise((resolve) => {
    // Cancel any existing transition
    const existing = instances.get(element);
    if (existing?.animation) {
      existing.animation.cancel();
    }

    const transitionConfig = transition(element, config);
    const duration = transitionConfig.duration || 300;
    const delay = transitionConfig.delay || 0;
    const easing = typeof transitionConfig.easing === 'string' 
      ? transitionConfig.easing 
      : 'ease-in';

    instances.set(element, { state: 'exiting' });

    // If custom css function provided, use it (reversed)
    if (transitionConfig.css) {
      const keyframes: Keyframe[] = [];
      const steps = 60;
      
      for (let i = 0; i <= steps; i++) {
        const t = 1 - (i / steps); // Reverse direction
        const u = 1 - t;
        const css = transitionConfig.css(t, u);
        keyframes.push(parseCSSToKeyframe(css));
      }

      const animation = element.animate(keyframes, {
        duration,
        delay,
        easing: easing as string,
        fill: 'forwards'
      });

      const instance = instances.get(element)!;
      instance.animation = animation;

      animation.onfinish = () => {
        instance.state = 'exited';
        instance.animation = undefined;
        resolve();
      };

      return;
    }

    // If tick function provided, use it (reversed)
    if (transitionConfig.tick) {
      const startTime = Date.now() + delay;
      const endTime = startTime + duration;

      const tick = () => {
        const now = Date.now();
        if (now < startTime) {
          requestAnimationFrame(tick);
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = 1 - progress; // Reverse
        const u = 1 - t;

        transitionConfig.tick!(t, u);

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          const instance = instances.get(element)!;
          instance.state = 'exited';
          resolve();
        }
      };

      requestAnimationFrame(tick);
      return;
    }

    // Fallback: immediate
    const instance = instances.get(element)!;
    instance.state = 'exited';
    resolve();
  });
}

/**
 * Get current transition state of element
 */
export function getState(element: HTMLElement): TransitionState {
  return instances.get(element)?.state || 'exited';
}

/**
 * Cancel any active transition on element
 */
export function cancel(element: HTMLElement): void {
  const instance = instances.get(element);
  if (instance?.animation) {
    instance.animation.cancel();
    instance.animation = undefined;
  }
}
