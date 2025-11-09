/**
 * Hyperparameter tuning framework for clustering algorithms
 */

import { evaluateClustering, ClusterMetrics } from './clusterEvaluation';
import { ClusteringStrategy } from './clusterStrategies';
import { reduceDimensionality } from './dimensionalityReduction';

export interface TuningResult {
  strategy: string;
  params: any;
  metrics: ClusterMetrics;
  labels: number[];
  score: number; // Combined score for ranking
}

export interface TuningConfig {
  scoringWeights?: {
    silhouette?: number;
    daviesBouldin?: number;
    numClusters?: number;
  };
  verbose?: boolean;
  dimensionalityReduction?: {
    enabled: boolean;
    method?: 'pca' | 'umap';
    targetDimensions?: number;
  };
}

/**
 * Grid search for hyperparameter tuning
 */
export class GridSearchTuner {
  private config: TuningConfig;

  constructor(config: TuningConfig = {}) {
    this.config = {
      scoringWeights: {
        silhouette: 0.6,
        daviesBouldin: 0.3,
        numClusters: 0.1,
        ...config.scoringWeights
      },
      verbose: config.verbose || false
    };
  }

  /**
   * Tune a clustering strategy by trying different parameter combinations
   */
  tune(
    strategy: ClusteringStrategy,
    vectors: number[][],
    paramGrid: { [key: string]: any[] }
  ): TuningResult[] {
    const results: TuningResult[] = [];

    // Apply dimensionality reduction if configured
    let processedVectors = vectors;
    if (this.config.dimensionalityReduction?.enabled) {
      const { method = 'pca', targetDimensions } = this.config.dimensionalityReduction;
      processedVectors = reduceDimensionality(
        vectors,
        method,
        targetDimensions,
        this.config.verbose
      );
    }

    // Generate all parameter combinations
    const paramCombinations = this.generateParamCombinations(paramGrid);

    if (this.config.verbose) {
      console.log(`Testing ${paramCombinations.length} parameter combinations for ${strategy.name}`);
    }

    for (const params of paramCombinations) {
      try {
        const labels = strategy.cluster(processedVectors, params);
        const metrics = evaluateClustering(processedVectors, labels);
        const score = this.calculateScore(metrics);

        results.push({
          strategy: strategy.name,
          params,
          metrics,
          labels,
          score
        });

        if (this.config.verbose) {
          console.log(`Params: ${JSON.stringify(params)}, Score: ${score.toFixed(3)}, ` +
            `Silhouette: ${metrics.silhouetteScore.toFixed(3)}, ` +
            `Clusters: ${metrics.numClusters}, Noise: ${metrics.numNoise}`);
        }
      } catch (error) {
        if (this.config.verbose) {
          console.warn(`Failed with params ${JSON.stringify(params)}:`, error);
        }
      }
    }

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Compare multiple strategies and return the best one
   */
  compareStrategies(
    strategies: Array<{ strategy: ClusteringStrategy; paramGrid: { [key: string]: any[] } }>,
    vectors: number[][]
  ): TuningResult {
    const allResults: TuningResult[] = [];

    for (const { strategy, paramGrid } of strategies) {
      const results = this.tune(strategy, vectors, paramGrid);
      allResults.push(...results);
    }

    // Sort all results and return the best
    allResults.sort((a, b) => b.score - a.score);

    if (this.config.verbose && allResults.length > 0) {
      console.log('\n=== Top 5 Results ===');
      allResults.slice(0, 5).forEach((result, idx) => {
        console.log(`${idx + 1}. ${result.strategy} - Score: ${result.score.toFixed(3)}`);
        console.log(`   Params: ${JSON.stringify(result.params)}`);
        console.log(`   Silhouette: ${result.metrics.silhouetteScore.toFixed(3)}, ` +
          `DB Index: ${result.metrics.daviesBouldinIndex.toFixed(3)}, ` +
          `Clusters: ${result.metrics.numClusters}, Noise: ${result.metrics.numNoise}`);
      });
    }

    return allResults[0];
  }

  /**
   * Calculate combined score from metrics
   * Higher is better
   */
  private calculateScore(metrics: ClusterMetrics): number {
    const weights = this.config.scoringWeights!;

    // Normalize silhouette score (range [-1, 1] -> [0, 1])
    const silhouetteNorm = (metrics.silhouetteScore + 1) / 2;

    // Normalize Davies-Bouldin (lower is better, typical range [0, 2+])
    // Convert to higher-is-better score
    const dbNorm = Math.max(0, 1 - metrics.daviesBouldinIndex / 2);

    // Prefer moderate number of clusters
    // Penalize too few or too many clusters
    const expectedClusters = 5; // Adjust based on your domain
    const clusterPenalty = Math.abs(metrics.numClusters - expectedClusters) / expectedClusters;
    const clusterScore = Math.max(0, 1 - clusterPenalty);

    const score =
      weights.silhouette! * silhouetteNorm +
      weights.daviesBouldin! * dbNorm +
      weights.numClusters! * clusterScore;

    return score;
  }

  /**
   * Generate all combinations of parameters from a grid
   */
  private generateParamCombinations(paramGrid: { [key: string]: any[] }): any[] {
    const keys = Object.keys(paramGrid);

    if (keys.length === 0) return [{}];

    const combinations: any[] = [];

    const generate = (index: number, current: any) => {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      const values = paramGrid[key];

      for (const value of values) {
        current[key] = value;
        generate(index + 1, current);
      }
    };

    generate(0, {});
    return combinations;
  }
}

/**
 * Elbow method for determining optimal number of clusters
 */
export function findOptimalK(vectors: number[][], kRange: number[] = [2, 3, 4, 5, 6, 7, 8]): number {
  const inertias: number[] = [];

  for (const k of kRange) {
    let inertia = 0;

    // Simple k-means to calculate inertia
    const n = vectors.length;
    const labels = new Array(n).fill(0);

    // Random initialization
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const randomIdx = Math.floor(Math.random() * n);
      centroids.push([...vectors[randomIdx]]);
    }

    // Run k-means for a few iterations
    for (let iter = 0; iter < 10; iter++) {
      // Assign
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestCluster = 0;

        for (let j = 0; j < k; j++) {
          let dist = 0;
          for (let d = 0; d < vectors[i].length; d++) {
            const diff = vectors[i][d] - centroids[j][d];
            dist += diff * diff;
          }

          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        }

        labels[i] = bestCluster;
      }

      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterPoints = vectors.filter((_, i) => labels[i] === j);

        if (clusterPoints.length > 0) {
          const dim = vectors[0].length;
          const newCentroid = new Array(dim).fill(0);

          for (const point of clusterPoints) {
            for (let d = 0; d < dim; d++) {
              newCentroid[d] += point[d];
            }
          }

          for (let d = 0; d < dim; d++) {
            newCentroid[d] /= clusterPoints.length;
          }

          centroids[j] = newCentroid;
        }
      }
    }

    // Calculate inertia
    for (let i = 0; i < n; i++) {
      const centroid = centroids[labels[i]];
      let dist = 0;
      for (let d = 0; d < vectors[i].length; d++) {
        const diff = vectors[i][d] - centroid[d];
        dist += diff * diff;
      }
      inertia += dist;
    }

    inertias.push(inertia);
  }

  // Find elbow using rate of change
  const rateOfChange: number[] = [];
  for (let i = 1; i < inertias.length; i++) {
    rateOfChange.push(inertias[i - 1] - inertias[i]);
  }

  // Find where rate of change decreases most significantly
  let maxChange = -Infinity;
  let elbowIdx = 0;

  for (let i = 1; i < rateOfChange.length; i++) {
    const change = rateOfChange[i - 1] - rateOfChange[i];
    if (change > maxChange) {
      maxChange = change;
      elbowIdx = i;
    }
  }

  return kRange[elbowIdx + 1] || kRange[Math.floor(kRange.length / 2)];
}
