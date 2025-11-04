/**
 * Built-in transitions for Auwla
 * Inspired by Svelte's transition system
 */

import type { TransitionConfig } from './core';

// ============================================================================
// Easing Functions
// ============================================================================

export const easings = {
  linear: (t: number) => t,
  
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number) => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  easeInBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t: number) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
};

// ============================================================================
// Fade Transition
// ============================================================================

export interface FadeParams {
  duration?: number;
  delay?: number;
  easing?: string;
}

export function fade(node: HTMLElement, params?: FadeParams): TransitionConfig {
  const duration = params?.duration || 300;
  const delay = params?.delay || 0;
  const easing = params?.easing || 'ease-out';

  return {
    duration,
    delay,
    easing,
    css: (t) => `opacity: ${t}`
  };
}

// ============================================================================
// Fly Transition
// ============================================================================

export interface FlyParams {
  duration?: number;
  delay?: number;
  easing?: string;
  x?: number;
  y?: number;
  opacity?: number;
}

export function fly(node: HTMLElement, params?: FlyParams): TransitionConfig {
  const duration = params?.duration || 400;
  const delay = params?.delay || 0;
  const easing = params?.easing || 'ease-out';
  const x = params?.x || 0;
  const y = params?.y || 0;
  const opacity = params?.opacity ?? 0;

  return {
    duration,
    delay,
    easing,
    css: (t, u) => {
      return `
        transform: translate(${u * x}px, ${u * y}px);
        opacity: ${t - u + opacity}
      `.trim();
    }
  };
}

// ============================================================================
// Slide Transition
// ============================================================================

export interface SlideParams {
  duration?: number;
  delay?: number;
  easing?: string;
  axis?: 'x' | 'y';
}

export function slide(node: HTMLElement, params?: SlideParams): TransitionConfig {
  const duration = params?.duration || 400;
  const delay = params?.delay || 0;
  const easing = params?.easing || 'ease-out';
  const axis = params?.axis || 'y';

  const style = getComputedStyle(node);
  const opacity = +style.opacity;
  const primaryDimension = axis === 'y' ? 'height' : 'width';
  const primaryDimensionValue = parseFloat(style[primaryDimension]);
  const paddingStart = axis === 'y' ? 'paddingTop' : 'paddingLeft';
  const paddingEnd = axis === 'y' ? 'paddingBottom' : 'paddingRight';
  const marginStart = axis === 'y' ? 'marginTop' : 'marginLeft';
  const marginEnd = axis === 'y' ? 'marginBottom' : 'marginRight';
  const paddingStartValue = parseFloat(style[paddingStart]);
  const paddingEndValue = parseFloat(style[paddingEnd]);
  const marginStartValue = parseFloat(style[marginStart]);
  const marginEndValue = parseFloat(style[marginEnd]);

  return {
    duration,
    delay,
    easing,
    css: (t) => {
      return `
        overflow: hidden;
        opacity: ${Math.min(t * 20, 1) * opacity};
        ${primaryDimension}: ${t * primaryDimensionValue}px;
        ${paddingStart}: ${t * paddingStartValue}px;
        ${paddingEnd}: ${t * paddingEndValue}px;
        ${marginStart}: ${t * marginStartValue}px;
        ${marginEnd}: ${t * marginEndValue}px;
      `.trim();
    }
  };
}

// ============================================================================
// Scale Transition
// ============================================================================

export interface ScaleParams {
  duration?: number;
  delay?: number;
  easing?: string;
  start?: number;
  opacity?: number;
}

export function scale(node: HTMLElement, params?: ScaleParams): TransitionConfig {
  const duration = params?.duration || 300;
  const delay = params?.delay || 0;
  const easing = params?.easing || 'ease-out';
  const start = params?.start ?? 0;
  const opacity = params?.opacity ?? 0;

  return {
    duration,
    delay,
    easing,
    css: (t, u) => {
      return `
        transform: scale(${start + (1 - start) * t});
        opacity: ${t - u + opacity}
      `.trim();
    }
  };
}

// ============================================================================
// Blur Transition
// ============================================================================

export interface BlurParams {
  duration?: number;
  delay?: number;
  easing?: string;
  amount?: number;
  opacity?: number;
}

export function blur(node: HTMLElement, params?: BlurParams): TransitionConfig {
  const duration = params?.duration || 300;
  const delay = params?.delay || 0;
  const easing = params?.easing || 'ease-out';
  const amount = params?.amount || 5;
  const opacity = params?.opacity ?? 0;

  return {
    duration,
    delay,
    easing,
    css: (t, u) => {
      return `
        filter: blur(${u * amount}px);
        opacity: ${t - u + opacity}
      `.trim();
    }
  };
}

// ============================================================================
// Draw Transition (SVG stroke animation)
// ============================================================================

export interface DrawParams {
  duration?: number;
  delay?: number;
  easing?: string;
}

export function draw(node: SVGElement & SVGGeometryElement, params?: DrawParams): TransitionConfig {
  const duration = params?.duration || 800;
  const delay = params?.delay || 0;
  const easing = params?.easing || 'ease-out';
  
  const len = node.getTotalLength();

  return {
    duration,
    delay,
    easing,
    css: (t, u) => {
      return `
        stroke-dasharray: ${t * len} ${u * len}
      `.trim();
    }
  };
}
