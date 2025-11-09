/**
 * Alternative clustering strategies to compare against the existing DBSCAN implementation
 */

import { cosineDistance } from './clusterEvaluation';

export interface ClusteringStrategy {
  name: string;
  cluster(vectors: number[][], params?: any): number[];
}

/**
 * K-means clustering with cosine distance
 */
export class KMeansStrategy implements ClusteringStrategy {
  name = 'K-Means';
  private rng: () => number = Math.random;

  cluster(vectors: number[][], params: { k?: number; maxIterations?: number; seed?: number } = {}): number[] {
    if (vectors.length === 0) return [];

    const k = params.k || Math.max(2, Math.floor(Math.sqrt(vectors.length / 2)));
    const maxIterations = params.maxIterations || 100;

    // Set up seeded random number generator if seed is provided
    if (params.seed !== undefined) {
      this.rng = this.createSeededRandom(params.seed);
    } else {
      this.rng = Math.random;
    }

    const n = vectors.length;
    const dim = vectors[0].length;

    // Initialize centroids using k-means++ for better initial placement
    const centroids = this.initializeCentroidsKMeansPlusPlus(vectors, k);
    let labels = new Array(n).fill(0);
    let prevLabels: number[] = [];

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assignment step: assign each point to nearest centroid
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestCluster = 0;

        for (let j = 0; j < k; j++) {
          const dist = cosineDistance(vectors[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        }

        labels[i] = bestCluster;
      }

      // Check convergence
      if (iter > 0 && labels.every((l, i) => l === prevLabels[i])) {
        break;
      }

      prevLabels = [...labels];

      // Update step: recalculate centroids
      for (let j = 0; j < k; j++) {
        const clusterPoints = vectors.filter((_, i) => labels[i] === j);

        if (clusterPoints.length === 0) {
          // Re-initialize empty cluster to a random point
          const randomIdx = Math.floor(this.rng() * n);
          centroids[j] = [...vectors[randomIdx]];
          continue;
        }

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

    return labels;
  }

  private initializeCentroidsKMeansPlusPlus(vectors: number[][], k: number): number[][] {
    const n = vectors.length;
    const centroids: number[][] = [];

    // Choose first centroid randomly
    const firstIdx = Math.floor(this.rng() * n);
    centroids.push([...vectors[firstIdx]]);

    // Choose remaining centroids with probability proportional to distance from nearest existing centroid
    for (let i = 1; i < k; i++) {
      const distances = vectors.map(v => {
        let minDist = Infinity;
        for (const centroid of centroids) {
          const dist = cosineDistance(v, centroid);
          minDist = Math.min(minDist, dist);
        }
        return minDist;
      });

      const totalDist = distances.reduce((a, b) => a + b, 0);
      const probabilities = distances.map(d => d / totalDist);

      // Weighted random selection
      let r = this.rng();
      let cumulative = 0;
      let selectedIdx = 0;

      for (let j = 0; j < n; j++) {
        cumulative += probabilities[j];
        if (r <= cumulative) {
          selectedIdx = j;
          break;
        }
      }

      centroids.push([...vectors[selectedIdx]]);
    }

    return centroids;
  }

  /**
   * Simple seeded random number generator (Linear Congruential Generator)
   */
  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
}

/**
 * Hierarchical Agglomerative Clustering
 */
export class HierarchicalStrategy implements ClusteringStrategy {
  name = 'Hierarchical';

  cluster(vectors: number[][], params: { numClusters?: number; linkage?: 'single' | 'complete' | 'average' } = {}): number[] {
    if (vectors.length === 0) return [];

    const numClusters = params.numClusters || Math.max(2, Math.floor(Math.sqrt(vectors.length / 2)));
    const linkage = params.linkage || 'average';

    const n = vectors.length;

    // Initialize each point as its own cluster
    const clusters: Set<number>[] = vectors.map((_, i) => new Set([i]));
    const labels = new Array(n).fill(0).map((_, i) => i);

    // Precompute distance matrix
    const distMatrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      distMatrix[i] = [];
      for (let j = 0; j < n; j++) {
        distMatrix[i][j] = i === j ? 0 : cosineDistance(vectors[i], vectors[j]);
      }
    }

    // Merge clusters until we reach desired number
    while (clusters.filter(c => c.size > 0).length > numClusters) {
      let minDist = Infinity;
      let mergeI = -1;
      let mergeJ = -1;

      // Find closest pair of clusters
      for (let i = 0; i < clusters.length; i++) {
        if (clusters[i].size === 0) continue;

        for (let j = i + 1; j < clusters.length; j++) {
          if (clusters[j].size === 0) continue;

          const dist = this.clusterDistance(clusters[i], clusters[j], distMatrix, linkage);

          if (dist < minDist) {
            minDist = dist;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      if (mergeI === -1 || mergeJ === -1) break;

      // Merge clusters
      for (const idx of clusters[mergeJ]) {
        clusters[mergeI].add(idx);
      }
      clusters[mergeJ].clear();
    }

    // Assign final labels
    let clusterId = 0;
    for (const cluster of clusters) {
      if (cluster.size > 0) {
        for (const idx of cluster) {
          labels[idx] = clusterId;
        }
        clusterId++;
      }
    }

    return labels;
  }

  private clusterDistance(
    cluster1: Set<number>,
    cluster2: Set<number>,
    distMatrix: number[][],
    linkage: 'single' | 'complete' | 'average'
  ): number {
    const distances: number[] = [];

    for (const i of cluster1) {
      for (const j of cluster2) {
        distances.push(distMatrix[i][j]);
      }
    }

    if (distances.length === 0) return Infinity;

    switch (linkage) {
      case 'single':
        return Math.min(...distances);
      case 'complete':
        return Math.max(...distances);
      case 'average':
        return distances.reduce((a, b) => a + b, 0) / distances.length;
    }
  }
}

/**
 * Affinity Propagation clustering
 */
export class AffinityPropagationStrategy implements ClusteringStrategy {
  name = 'Affinity Propagation';

  cluster(vectors: number[][], params: { preference?: number; damping?: number; maxIterations?: number } = {}): number[] {
    if (vectors.length === 0) return [];

    const n = vectors.length;
    const damping = params.damping || 0.5;
    const maxIterations = params.maxIterations || 200;

    // Compute similarity matrix (negative distance)
    const S: number[][] = [];
    for (let i = 0; i < n; i++) {
      S[i] = [];
      for (let j = 0; j < n; j++) {
        S[i][j] = -cosineDistance(vectors[i], vectors[j]);
      }
    }

    // Set preference (median similarity if not specified)
    const preference = params.preference !== undefined
      ? params.preference
      : this.median(S.flat().filter((v, i) => i % (n + 1) !== 0)); // exclude diagonal

    for (let i = 0; i < n; i++) {
      S[i][i] = preference;
    }

    // Initialize responsibility and availability matrices
    const R: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    const A: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    // Iterate
    for (let iter = 0; iter < maxIterations; iter++) {
      // Update responsibilities
      const Rold = R.map(row => [...row]);

      for (let i = 0; i < n; i++) {
        for (let k = 0; k < n; k++) {
          const vals: number[] = [];
          for (let kp = 0; kp < n; kp++) {
            if (kp !== k) {
              vals.push(A[i][kp] + S[i][kp]);
            }
          }
          const maxVal = vals.length > 0 ? Math.max(...vals) : 0;
          R[i][k] = S[i][k] - maxVal;
        }
      }

      // Damping
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < n; k++) {
          R[i][k] = damping * Rold[i][k] + (1 - damping) * R[i][k];
        }
      }

      // Update availabilities
      const Aold = A.map(row => [...row]);

      for (let i = 0; i < n; i++) {
        for (let k = 0; k < n; k++) {
          if (i === k) {
            let sum = 0;
            for (let ip = 0; ip < n; ip++) {
              if (ip !== k) {
                sum += Math.max(0, R[ip][k]);
              }
            }
            A[i][k] = sum;
          } else {
            let sum = 0;
            for (let ip = 0; ip < n; ip++) {
              if (ip !== k && ip !== i) {
                sum += Math.max(0, R[ip][k]);
              }
            }
            A[i][k] = Math.min(0, R[k][k] + sum);
          }
        }
      }

      // Damping
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < n; k++) {
          A[i][k] = damping * Aold[i][k] + (1 - damping) * A[i][k];
        }
      }
    }

    // Identify exemplars and assign clusters
    const labels = new Array(n).fill(-1);
    const exemplars: number[] = [];

    for (let i = 0; i < n; i++) {
      if (R[i][i] + A[i][i] > 0) {
        exemplars.push(i);
      }
    }

    // Assign each point to nearest exemplar
    for (let i = 0; i < n; i++) {
      let maxSim = -Infinity;
      let bestExemplar = -1;

      for (const ex of exemplars) {
        const sim = S[i][ex];
        if (sim > maxSim) {
          maxSim = sim;
          bestExemplar = ex;
        }
      }

      labels[i] = bestExemplar !== -1 ? exemplars.indexOf(bestExemplar) : 0;
    }

    return labels;
  }

  private median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}

/**
 * Enhanced DBSCAN with automatic parameter tuning
 */
export class AdaptiveDBSCANStrategy implements ClusteringStrategy {
  name = 'Adaptive DBSCAN';

  cluster(vectors: number[][], params: { autoTune?: boolean; epsilon?: number; minPts?: number } = {}): number[] {
    if (vectors.length === 0) return [];

    // If specific parameters provided, use them directly
    if (params.epsilon !== undefined && params.minPts !== undefined) {
      return this.dbscan(vectors, params.epsilon, params.minPts);
    }

    const autoTune = params.autoTune !== false;

    let bestLabels: number[] = [];
    let bestScore = -1;

    if (autoTune) {
      // Try multiple parameter combinations
      const epsilonValues = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
      const minPtsValues = [1, 2, 3, 4, 5];

      for (const eps of epsilonValues) {
        for (const minPts of minPtsValues) {
          const labels = this.dbscan(vectors, eps, minPts);
          const score = this.evaluateLabels(vectors, labels);

          if (score > bestScore) {
            bestScore = score;
            bestLabels = labels;
          }
        }
      }
    } else {
      // Use default parameters
      const eps = params.epsilon || 0.5;
      const minPts = params.minPts || 2;
      bestLabels = this.dbscan(vectors, eps, minPts);
    }

    return bestLabels;
  }

  private dbscan(vectors: number[][], eps: number, minPts: number): number[] {
    const n = vectors.length;
    const labels = new Array(n).fill(-1);
    let clusterId = 0;

    const visited = new Set<number>();

    const regionQuery = (idx: number): number[] => {
      const neighbors: number[] = [];
      for (let i = 0; i < n; i++) {
        if (cosineDistance(vectors[idx], vectors[i]) <= eps) {
          neighbors.push(i);
        }
      }
      return neighbors;
    };

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;

      visited.add(i);
      const neighbors = regionQuery(i);

      if (neighbors.length < minPts) {
        labels[i] = -1; // Noise
      } else {
        labels[i] = clusterId;

        const queue = [...neighbors];
        let qIdx = 0;

        while (qIdx < queue.length) {
          const j = queue[qIdx];

          if (!visited.has(j)) {
            visited.add(j);
            const newNeighbors = regionQuery(j);

            if (newNeighbors.length >= minPts) {
              for (const neighbor of newNeighbors) {
                if (!queue.includes(neighbor)) {
                  queue.push(neighbor);
                }
              }
            }
          }

          if (labels[j] === -1) {
            labels[j] = clusterId;
          }

          qIdx++;
        }

        clusterId++;
      }
    }

    return labels;
  }

  private evaluateLabels(vectors: number[][], labels: number[]): number {
    // Simple heuristic: favor configurations with moderate number of clusters and low noise
    const uniqueClusters = new Set(labels.filter(l => l !== -1));
    const numNoise = labels.filter(l => l === -1).length;

    if (uniqueClusters.size === 0) return -1;

    const noiseRatio = numNoise / labels.length;
    const clusterPenalty = Math.abs(uniqueClusters.size - Math.sqrt(vectors.length));

    return 1 / (1 + noiseRatio + clusterPenalty * 0.1);
  }
}
