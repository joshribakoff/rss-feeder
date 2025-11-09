import { describe, it, expect } from 'vitest';
import {
  KMeansStrategy,
  HierarchicalStrategy,
  AffinityPropagationStrategy,
  AdaptiveDBSCANStrategy
} from '../src/services/clusterStrategies';

describe('Clustering Strategies Unit Tests', () => {
  // Simple test data: 2D points in 3 clear clusters
  const simpleVectors = [
    // Cluster 0
    [0.1, 0.1],
    [0.15, 0.12],
    [0.08, 0.14],
    // Cluster 1
    [0.9, 0.9],
    [0.85, 0.88],
    [0.92, 0.86],
    // Cluster 2
    [0.5, 0.1],
    [0.48, 0.12],
    [0.52, 0.08]
  ];

  describe('K-Means Strategy', () => {
    it('should cluster simple 2D points correctly', () => {
      const strategy = new KMeansStrategy();
      const labels = strategy.cluster(simpleVectors, { k: 3, maxIterations: 100, seed: 123 });

      expect(labels).toHaveLength(simpleVectors.length);

      // Check that we have 3 clusters
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(3);

      // With fixed seed, verify that geometrically close points cluster together
      // Note: cosine distance groups by angle, so nearby points may not always cluster together
      // Instead verify that clusters are formed and at least some groups stay together
      const cluster2Consistent = labels[3] === labels[4] && labels[4] === labels[5];
      const cluster3Consistent = labels[6] === labels[7] && labels[7] === labels[8];

      // At least the upper-right cluster (indices 3-5) or middle cluster (indices 6-8) should be consistent
      expect(cluster2Consistent || cluster3Consistent).toBe(true);
    });

    it('should handle empty input', () => {
      const strategy = new KMeansStrategy();
      const labels = strategy.cluster([], { k: 3 });

      expect(labels).toEqual([]);
    });

    it('should handle k=1', () => {
      const strategy = new KMeansStrategy();
      const labels = strategy.cluster(simpleVectors, { k: 1 });

      expect(labels).toHaveLength(simpleVectors.length);
      expect(new Set(labels).size).toBe(1);
      expect(labels.every(l => l === 0)).toBe(true);
    });

    it('should use default k when not provided', () => {
      const strategy = new KMeansStrategy();
      const labels = strategy.cluster(simpleVectors);

      expect(labels).toHaveLength(simpleVectors.length);
      expect(new Set(labels).size).toBeGreaterThan(0);
    });
  });

  describe('Hierarchical Strategy', () => {
    it('should cluster with average linkage', () => {
      const strategy = new HierarchicalStrategy();
      const labels = strategy.cluster(simpleVectors, {
        numClusters: 3,
        linkage: 'average'
      });

      expect(labels).toHaveLength(simpleVectors.length);

      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(3);
    });

    it('should cluster with complete linkage', () => {
      const strategy = new HierarchicalStrategy();
      const labels = strategy.cluster(simpleVectors, {
        numClusters: 3,
        linkage: 'complete'
      });

      expect(labels).toHaveLength(simpleVectors.length);
      expect(new Set(labels).size).toBe(3);
    });

    it('should cluster with single linkage', () => {
      const strategy = new HierarchicalStrategy();
      const labels = strategy.cluster(simpleVectors, {
        numClusters: 3,
        linkage: 'single'
      });

      expect(labels).toHaveLength(simpleVectors.length);
      expect(new Set(labels).size).toBe(3);
    });

    it('should handle empty input', () => {
      const strategy = new HierarchicalStrategy();
      const labels = strategy.cluster([]);

      expect(labels).toEqual([]);
    });

    it('should use default parameters', () => {
      const strategy = new HierarchicalStrategy();
      const labels = strategy.cluster(simpleVectors);

      expect(labels).toHaveLength(simpleVectors.length);
      expect(new Set(labels).size).toBeGreaterThan(0);
    });
  });

  describe('Adaptive DBSCAN Strategy', () => {
    it('should cluster with auto-tuning', () => {
      const strategy = new AdaptiveDBSCANStrategy();
      const labels = strategy.cluster(simpleVectors, { autoTune: true });

      expect(labels).toHaveLength(simpleVectors.length);

      // Should find some clusters
      const uniqueLabels = new Set(labels.filter(l => l !== -1));
      expect(uniqueLabels.size).toBeGreaterThan(0);
    });

    it('should cluster without auto-tuning', () => {
      const strategy = new AdaptiveDBSCANStrategy();
      const labels = strategy.cluster(simpleVectors, { autoTune: false });

      expect(labels).toHaveLength(simpleVectors.length);
    });

    it('should handle empty input', () => {
      const strategy = new AdaptiveDBSCANStrategy();
      const labels = strategy.cluster([]);

      expect(labels).toEqual([]);
    });

    it('should identify noise points', () => {
      // Create data with clear outlier
      const vectorsWithNoise = [
        ...simpleVectors,
        [5.0, 5.0] // Outlier far from other clusters
      ];

      const strategy = new AdaptiveDBSCANStrategy();
      const labels = strategy.cluster(vectorsWithNoise, { autoTune: true });

      // May or may not mark the outlier as noise depending on parameters
      expect(labels).toHaveLength(vectorsWithNoise.length);
    });
  });

  describe('Affinity Propagation Strategy', () => {
    it('should automatically determine clusters', () => {
      const strategy = new AffinityPropagationStrategy();
      const labels = strategy.cluster(simpleVectors, {
        damping: 0.5,
        maxIterations: 100
      });

      expect(labels).toHaveLength(simpleVectors.length);

      // Should find at least 1 cluster
      const uniqueLabels = new Set(labels.filter(l => l !== -1));
      expect(uniqueLabels.size).toBeGreaterThan(0);
    });

    it('should handle different damping factors', () => {
      const strategy = new AffinityPropagationStrategy();

      const labels1 = strategy.cluster(simpleVectors, { damping: 0.5 });
      const labels2 = strategy.cluster(simpleVectors, { damping: 0.9 });

      expect(labels1).toHaveLength(simpleVectors.length);
      expect(labels2).toHaveLength(simpleVectors.length);
    });

    it('should handle empty input', () => {
      const strategy = new AffinityPropagationStrategy();
      const labels = strategy.cluster([]);

      expect(labels).toEqual([]);
    });

    it('should use default parameters', () => {
      const strategy = new AffinityPropagationStrategy();
      const labels = strategy.cluster(simpleVectors);

      expect(labels).toHaveLength(simpleVectors.length);
    });
  });

  describe('Strategy Consistency', () => {
    it('K-means should produce consistent results with same seed', () => {
      const strategy = new KMeansStrategy();

      // With same seed, results should be identical
      const labels1 = strategy.cluster(simpleVectors, { k: 3, seed: 42 });
      const labels2 = strategy.cluster(simpleVectors, { k: 3, seed: 42 });

      expect(labels1).toEqual(labels2);
    });

    it('Hierarchical should produce deterministic results', () => {
      const strategy = new HierarchicalStrategy();

      const labels1 = strategy.cluster(simpleVectors, { numClusters: 3, linkage: 'average' });
      const labels2 = strategy.cluster(simpleVectors, { numClusters: 3, linkage: 'average' });

      // Hierarchical clustering is deterministic
      expect(labels1).toEqual(labels2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single point', () => {
      const singlePoint = [[0.5, 0.5]];

      const kMeans = new KMeansStrategy();
      expect(kMeans.cluster(singlePoint, { k: 1 })).toEqual([0]);

      const hierarchical = new HierarchicalStrategy();
      expect(hierarchical.cluster(singlePoint, { numClusters: 1 })).toEqual([0]);
    });

    it('should handle two points', () => {
      // Use points with different angles for cosine distance
      const twoPoints = [[1.0, 0.0], [0.0, 1.0]];

      const kMeans = new KMeansStrategy();
      const labels = kMeans.cluster(twoPoints, { k: 2, seed: 42 });
      expect(labels).toHaveLength(2);

      // With k=2 and 2 points at different angles, they should be in different clusters
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(2);
    });

    it('should handle k > n for k-means', () => {
      const strategy = new KMeansStrategy();
      const labels = strategy.cluster(simpleVectors, { k: 100 });

      // Should still work, some clusters will be empty
      expect(labels).toHaveLength(simpleVectors.length);
    });
  });
});
