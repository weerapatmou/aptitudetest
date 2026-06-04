// Re-export the shared seedable PRNG so generation is reproducible in tests,
// matching the pattern used by the other puzzle modules.
export { makeRng, defaultRng } from '../../rotation-puzzle/generate/rng';
export type { Rng } from '../../rotation-puzzle/generate/rng';
