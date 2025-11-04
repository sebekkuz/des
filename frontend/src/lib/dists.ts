// Utilities for sampling from common probability distributions.  These
// functions are deterministic if provided with a seeded PRNG.  Here we
// implement simple versions using Math.random().

export function uniform(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function exponential(mean: number): number {
  return -mean * Math.log(1 - Math.random());
}

export function triangular(min: number, mode: number, max: number): number {
  const u = Math.random();
  const c = (mode - min) / (max - min);
  if (u < c) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}