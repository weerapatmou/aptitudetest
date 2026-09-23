// Reuse the shared seedable mulberry32 PRNG so page generation is testable.
export { makeRng, type Rng } from '../../rotation-puzzle/generate/rng';
