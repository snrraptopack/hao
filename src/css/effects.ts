import type { Time, Transform, Transition } from './types';
import type { GlobalCssValues } from './positioning';

export type AnimationDirectionValue = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse' | GlobalCssValues | (string & {});

export type AnimationFillModeValue = 'none' | 'forwards' | 'backwards' | 'both' | GlobalCssValues | (string & {});

export type AnimationPlayStateValue = 'running' | 'paused' | GlobalCssValues | (string & {});

export interface EffectsProperties {
  animation?: string | GlobalCssValues;
  animationDelay?: Time | string | number | GlobalCssValues;
  animationDirection?: AnimationDirectionValue;
  animationDuration?: Time | string | number | GlobalCssValues;
  animationFillMode?: AnimationFillModeValue;
  animationIterationCount?: number | 'infinite' | string | GlobalCssValues;
  animationName?: string | GlobalCssValues;
  animationPlayState?: AnimationPlayStateValue;
  animationTimingFunction?: string | GlobalCssValues;
  
  transform?: Transform | string | GlobalCssValues;
  transformOrigin?: string | GlobalCssValues;
  
  transition?: Transition | string | GlobalCssValues;
  transitionDelay?: Time | string | number | GlobalCssValues;
  transitionDuration?: Time | string | number | GlobalCssValues;
  transitionProperty?: string | GlobalCssValues;
  transitionTimingFunction?: string | GlobalCssValues;
}
