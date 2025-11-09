import { describe, it, expect } from 'vitest';
import { Vectorize } from '../src/services/vectorize';
import {
  KMeansStrategy,
  HierarchicalStrategy,
  AffinityPropagationStrategy,
  AdaptiveDBSCANStrategy
} from '../src/services/clusterStrategies';
import { GridSearchTuner, findOptimalK } from '../src/services/clusterTuning';
import { evaluateClustering } from '../src/services/clusterEvaluation';
import { mixedArticles, techOnlyArticles } from './mocks';

describe('Clustering Strategy Comparison', () => {
  describe('Strategy Performance on Mixed Articles', () => {
    it('should compare multiple strategies and select the best one', () => {
      const vectorizer = new Vectorize();
      const vectorizedArticles = vectorizer.vectorizeArticles(mixedArticles);
      const vectors = vectorizedArticles.map(article => article.vector);

      const tuner = new GridSearchTuner({ verbose: true });

      // Define strategies and their parameter grids
      const strategies = [
        {
          strategy: new KMeansStrategy(),
          paramGrid: {
            k: [3, 4, 5, 6],
            maxIterations: [100]
          }
        },
        {
          strategy: new HierarchicalStrategy(),
          paramGrid: {
            numClusters: [3, 4, 5, 6],
            linkage: ['average', 'complete']
          }
        },
        {
          strategy: new AdaptiveDBSCANStrategy(),
          paramGrid: {
            autoTune: [true]
          }
        }
      ];

      const bestResult = tuner.compareStrategies(strategies, vectors);

      console.log('\n=== Best Strategy ===');
      console.log('Strategy:', bestResult.strategy);
      console.log('Params:', JSON.stringify(bestResult.params));
      console.log('Metrics:', bestResult.metrics);
      console.log('Score:', bestResult.score);

      // Assertions
      expect(bestResult).toBeDefined();
      expect(bestResult.metrics.numClusters).toBeGreaterThan(0);
      expect(bestResult.metrics.silhouetteScore).toBeGreaterThan(-1);
      expect(bestResult.metrics.silhouetteScore).toBeLessThanOrEqual(1);
    });

    it('should evaluate K-means with different K values', () => {
      const vectorizer = new Vectorize();
      const vectorizedArticles = vectorizer.vectorizeArticles(mixedArticles);
      const vectors = vectorizedArticles.map(article => article.vector);

      const strategy = new KMeansStrategy();
      const tuner = new GridSearchTuner({ verbose: false });

      const results = tuner.tune(strategy, vectors, {
        k: [2, 3, 4, 5, 6, 7, 8],
        maxIterations: [100]
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score);

      console.log('\nK-means Results (Top 3):');
      results.slice(0, 3).forEach((result, idx) => {
        console.log(`${idx + 1}. k=${result.params.k}: Score=${result.score.toFixed(3)}, ` +
          `Silhouette=${result.metrics.silhouetteScore.toFixed(3)}, ` +
          `Clusters=${result.metrics.numClusters}`);
      });
    });

    it('should evaluate Hierarchical clustering with different linkages', () => {
      const vectorizer = new Vectorize();
      const vectorizedArticles = vectorizer.vectorizeArticles(mixedArticles);
      const vectors = vectorizedArticles.map(article => article.vector);

      const strategy = new HierarchicalStrategy();
      const tuner = new GridSearchTuner({ verbose: false });

      const results = tuner.tune(strategy, vectors, {
        numClusters: [3, 4, 5, 6],
        linkage: ['single', 'average', 'complete']
      });

      expect(results.length).toBeGreaterThan(0);

      console.log('\nHierarchical Clustering Results (Top 3):');
      results.slice(0, 3).forEach((result, idx) => {
        console.log(`${idx + 1}. clusters=${result.params.numClusters}, linkage=${result.params.linkage}: ` +
          `Score=${result.score.toFixed(3)}, Silhouette=${result.metrics.silhouetteScore.toFixed(3)}`);
      });
    });
  });

  describe('Strategy Performance on Tech-Only Articles', () => {
    it('should handle single-topic articles appropriately', () => {
      const vectorizer = new Vectorize();
      const vectorizedArticles = vectorizer.vectorizeArticles(techOnlyArticles);
      const vectors = vectorizedArticles.map(article => article.vector);

      const tuner = new GridSearchTuner({ verbose: false });

      const strategies = [
        {
          strategy: new KMeansStrategy(),
          paramGrid: { k: [1, 2, 3, 4] }
        },
        {
          strategy: new HierarchicalStrategy(),
          paramGrid: { numClusters: [1, 2, 3, 4], linkage: ['average'] }
        }
      ];

      const bestResult = tuner.compareStrategies(strategies, vectors);

      console.log('\n=== Best Strategy for Tech Articles ===');
      console.log('Strategy:', bestResult.strategy);
      console.log('Params:', JSON.stringify(bestResult.params));
      console.log('Number of clusters:', bestResult.metrics.numClusters);
      console.log('Silhouette score:', bestResult.metrics.silhouetteScore);

      // For similar articles, we expect fewer clusters
      expect(bestResult.metrics.numClusters).toBeLessThanOrEqual(4);
    });
  });

  describe('Optimal K Detection', () => {
    it('should find reasonable K using elbow method', () => {
      const vectorizer = new Vectorize();
      const vectorizedArticles = vectorizer.vectorizeArticles(mixedArticles);
      const vectors = vectorizedArticles.map(article => article.vector);

      const optimalK = findOptimalK(vectors, [2, 3, 4, 5, 6, 7, 8]);

      console.log('\nOptimal K (elbow method):', optimalK);

      expect(optimalK).toBeGreaterThanOrEqual(2);
      expect(optimalK).toBeLessThanOrEqual(8);
    });
  });

  describe('Metric Evaluation', () => {
    it('should calculate silhouette scores correctly', () => {
      const vectorizer = new Vectorize();
      const vectorizedArticles = vectorizer.vectorizeArticles(mixedArticles);
      const vectors = vectorizedArticles.map(article => article.vector);

      const strategy = new KMeansStrategy();
      const labels = strategy.cluster(vectors, { k: 4 });

      const metrics = evaluateClustering(vectors, labels);

      console.log('\nClustering Metrics:');
      console.log('Silhouette Score:', metrics.silhouetteScore);
      console.log('Davies-Bouldin Index:', metrics.daviesBouldinIndex);
      console.log('Number of Clusters:', metrics.numClusters);
      console.log('Cluster Sizes:', metrics.clusterSizes);

      expect(metrics.silhouetteScore).toBeGreaterThan(-1);
      expect(metrics.silhouetteScore).toBeLessThanOrEqual(1);
      expect(metrics.daviesBouldinIndex).toBeGreaterThanOrEqual(0);
      expect(metrics.numClusters).toBeGreaterThan(0);
    });

    it('should handle single cluster gracefully', () => {
      const vectorizer = new Vectorize();
      const vectorizedArticles = vectorizer.vectorizeArticles(techOnlyArticles);
      const vectors = vectorizedArticles.map(article => article.vector);

      const strategy = new KMeansStrategy();
      const labels = strategy.cluster(vectors, { k: 1 });

      const metrics = evaluateClustering(vectors, labels);

      // Single cluster should have silhouette score of 0
      expect(metrics.silhouetteScore).toBe(0);
      expect(metrics.numClusters).toBe(1);
    });
  });

  describe('Affinity Propagation', () => {
    it('should automatically determine number of clusters', () => {
      const vectorizer = new Vectorize();
      const vectorizedArticles = vectorizer.vectorizeArticles(mixedArticles);
      const vectors = vectorizedArticles.map(article => article.vector);

      const strategy = new AffinityPropagationStrategy();
      const labels = strategy.cluster(vectors, {
        damping: 0.5,
        maxIterations: 100
      });

      const metrics = evaluateClustering(vectors, labels);

      console.log('\nAffinity Propagation Results:');
      console.log('Number of clusters:', metrics.numClusters);
      console.log('Silhouette score:', metrics.silhouetteScore);

      expect(metrics.numClusters).toBeGreaterThan(0);
    });
  });
});
