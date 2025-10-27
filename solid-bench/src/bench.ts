export type Stat = {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  opsPerSec?: number;
};

export function summarize(samples: number[], ops = 1): Stat {
  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const variance = samples.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / n;
  const stddev = Math.sqrt(variance);
  const opsPerSec = (ops * 1000) / mean;
  return { mean, stddev, min, max, opsPerSec };
}

export function measure(fn: () => void): number {
  const t0 = performance.now();
  fn();
  const t1 = performance.now();
  return t1 - t0;
}