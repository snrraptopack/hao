/**
 * @file shared/spring.ts
 * @description
 * Shared spring physics computation used by both runtime and compiler.
 * Produces a CSS linear() easing curve from stiffness/damping/mass parameters.
 */

export function computeSpring(stiffness = 300, damping = 25, mass = 1): string {
  // ω₀ — natural (angular) frequency
  const omega0 = Math.sqrt(stiffness / mass);
  // ζ — damping ratio: < 1 underdamped (oscillates), = 1 critical, > 1 overdamped
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  // Estimate the duration needed for the spring to settle within 0.1% of target
  let duration: number;
  if (zeta >= 1) {
    // Overdamped or critically damped — decays without oscillation
    duration = 6 / (zeta * omega0);
  } else {
    // Underdamped — oscillates; capture enough of the tail to include the settle
    const settling = Math.log(0.001) / (-zeta * omega0);
    // Also ensure we capture at least one full oscillation period
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const period = (2 * Math.PI) / omegaD;
    duration = Math.max(settling, period * 1.5);
  }

  // Sample the spring position x(t) at SAMPLES equidistant points in [0, duration]
  const SAMPLES = 30;
  const points: string[] = [];

  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i / SAMPLES) * duration;
    let x: number;

    if (zeta < 1) {
      // Underdamped: oscillates around 1
      const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
      x = 1 - Math.exp(-zeta * omega0 * t) * (
        Math.cos(omegaD * t) + (zeta / omegaD) * Math.sin(omegaD * t)
      );
    } else if (zeta === 1) {
      // Critically damped: fastest approach without oscillation
      x = 1 - (1 + omega0 * t) * Math.exp(-omega0 * t);
    } else {
      // Overdamped: slower approach, no oscillation
      const sqrtTerm = Math.sqrt(zeta * zeta - 1);
      const r1 = omega0 * (-zeta + sqrtTerm);
      const r2 = omega0 * (-zeta - sqrtTerm);
      x = 1 + (r2 / (r1 - r2)) * Math.exp(r1 * t) - (r1 / (r1 - r2)) * Math.exp(r2 * t);
    }

    // CSS linear() allows output values outside [0, 1] for overshoot — clamp generously
    x = Math.max(-0.5, Math.min(1.5, x));

    // "output input%" — CSS linear() format
    const inputPct = ((i / SAMPLES) * 100).toFixed(1);
    points.push(`${x.toFixed(4)} ${inputPct}%`);
  }

  return `linear(${points.join(', ')})`;
}
