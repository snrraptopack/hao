/**
 * @file css.ts
 * @description
 * The main `css` entry point. Assembles all sub-modules into a single
 * cohesive API surface.
 *
 * Usage:
 *   import { css } from 'auwla/css'
 *
 * The `css` object exposes:
 *   - css({ ... })          — inline style call, returns a ResolvedStyle for style={}
 *   - css.px(), css.rem()   — typed length values (from units.ts)
 *   - css.color()           — typed color values (from color.ts)
 *   - css.border()          — typed border values (from values.ts)
 *   - css.shadow()          — typed shadow values (from values.ts)
 *   - css.transform()       — typed transform values (from values.ts)
 *   - css.transition()      — typed transition values (from values.ts)
 *   - css.grid()            — grid layout descriptor (from values.ts)
 *   - css.flex()            — flex layout descriptor (from values.ts)
 *   - css.ease()            — easing string helper (from values.ts)
 *   - css.merge()           — shallow-merge style objects (from compose.ts)
 *   - css.extend()          — extend a base style (from compose.ts)
 *   - css.define()          — named style fragments (from compose.ts)
 *
 * Design note:
 *   `css({ ... })` is the compiler's primary extraction target. Every call site
 *   that uses this function is a candidate for static CSS class generation in
 *   Milestone 4. The inline call resolves values eagerly at runtime via serialize.ts.
 */

import * as units from './units';
import * as colorModule from './color';
import * as valuesModule from './values';
import { merge, extend, define } from './compose';
import { resolve } from './serialize';
import type { ResolvedStyle, StyleObject } from './types';

// ---------------------------------------------------------------------------
// The css() call
// ---------------------------------------------------------------------------

/**
 * Resolve a StyleObject to a plain `Record<string, string>` suitable for
 * the browser's `style` attribute.
 *
 * The Vite plugin replaces this call at build time for static styles,
 * emitting a CSS class name string instead. Dynamic branches remain as
 * runtime object computations until they can be enumerated.
 *
 * @example
 * <button style={css({ padding: css.px(16), background: css.color('#3b82f6') })} />
 */
function css(style: StyleObject): ResolvedStyle {
  return resolve(style);
}

// ---------------------------------------------------------------------------
// Attach sub-modules
// ---------------------------------------------------------------------------

// Units
css.px    = units.px;
css.rem   = units.rem;
css.em    = units.em;
css.vw    = units.vw;
css.vh    = units.vh;
css.vmin  = units.vmin;
css.vmax  = units.vmax;
css.pct   = units.pct;
css.fr    = units.fr;
css.ch    = units.ch;
css.zero  = units.zero;
css.clamp = units.clamp;

// Time
css.ms = units.ms;
css.s  = units.s;

// Angle
css.deg  = units.deg;
css.rad  = units.rad;
css.turn = units.turn;

// Color
css.color    = colorModule.color;
css.gradient = colorModule.gradient;

// Composite values
css.border     = valuesModule.border;
css.shadow     = valuesModule.shadow;
css.transform  = valuesModule.transform;
css.transition = valuesModule.transition;
css.ease       = valuesModule.ease;
css.outline    = valuesModule.outline;

// Layout descriptors
css.grid = valuesModule.grid;
css.flex = valuesModule.flex;

// Composition
css.merge  = merge;
css.extend = extend;
css.define = define;

// ---------------------------------------------------------------------------
// Named exports for tree-shaking
// All consumers should prefer `import { css } from 'auwla/css'` for
// discoverability. Individual imports are available for advanced use cases.
// ---------------------------------------------------------------------------

export { css };

export type { ResolvedStyle, StyleObject };
