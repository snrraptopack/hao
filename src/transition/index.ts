/**
 * Auwla Transition System
 * 
 * Svelte-inspired transitions with CSS-based animations
 * Tree-shakeable - only imported if explicitly used
 * 
 * @example
 * ```tsx
 * import { fade, fly, scale } from 'auwla/transition';
 * import { When } from 'auwla';
 * 
 * // Simple fade
 * <When condition={show} transition={fade()}>
 *   <div>Content</div>
 * </When>
 * 
 * // Separate enter/exit
 * <When 
 *   condition={show} 
 *   enter={fly({ y: -20 })} 
 *   exit={fade({ duration: 200 })}
 * >
 *   <div>Content</div>
 * </When>
 * ```
 */

export * from './core';
export * from './transitions';
