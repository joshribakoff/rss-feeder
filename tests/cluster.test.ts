import { describe, it, expect } from 'vitest';
import clusterVectors from '../src/services/cluster';

describe('clusterVectors', () => {
  it('clusters simple 2D vectors into two groups and marks a zero-vector as noise', () => {
    const vectors = [
      [1, 0], // cluster A
      [0.9, 0.1], // cluster A (close to [1,0])
      [0, 1], // cluster B
      [0.1, 0.9], // cluster B (close to [0,1])
      [0, 0], // zero vector -> treated as noise
    ];

    // Small threshold to only group near-identical direction vectors
    const labels = clusterVectors(vectors, 0.05, 2);

    expect(labels).toHaveLength(vectors.length);

    // The first two should share a cluster label (non-negative)
    expect(labels[0]).toBeGreaterThanOrEqual(0);
    expect(labels[0]).toEqual(labels[1]);

    // The next two should share a different cluster label
    expect(labels[2]).toBeGreaterThanOrEqual(0);
    expect(labels[2]).toEqual(labels[3]);

    // The two clusters should not be the same label
    expect(labels[0]).not.toEqual(labels[2]);

    // The zero vector should be labeled noise (-1)
    expect(labels[4]).toBe(-1);
  });
});
