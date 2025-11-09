/**
 * Dimensionality reduction techniques for preprocessing before clustering
 *
 * PCA: Principal Component Analysis - Linear method, preserves global structure
 * UMAP: Uniform Manifold Approximation and Projection - Non-linear, preserves local structure
 */

/**
 * Principal Component Analysis (PCA)
 * Reduces dimensionality by projecting data onto principal components
 */
export class PCA {
  private components: number[][] | null = null;
  private mean: number[] | null = null;
  private explainedVariance: number[] | null = null;

  /**
   * Fit PCA model and transform vectors
   * @param vectors - Input vectors
   * @param nComponents - Number of components to keep (default: 30-50 for semantic vectors)
   */
  fitTransform(vectors: number[][], nComponents: number = 40): number[][] {
    const n = vectors.length;
    const d = vectors[0].length;

    // Ensure we don't try to extract more components than possible
    nComponents = Math.min(nComponents, Math.min(n, d));

    // Center the data
    this.mean = new Array(d).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < d; j++) {
        this.mean[j] += vectors[i][j];
      }
    }
    for (let j = 0; j < d; j++) {
      this.mean[j] /= n;
    }

    // Center vectors
    const centeredVectors: number[][] = vectors.map(v =>
      v.map((val, idx) => val - this.mean![idx])
    );

    // Compute covariance matrix
    const covariance = this.computeCovariance(centeredVectors);

    // Compute eigenvalues and eigenvectors using power iteration
    const eigen = this.powerIteration(covariance, nComponents);
    this.components = eigen.vectors;
    this.explainedVariance = eigen.values;

    // Transform vectors
    return this.transform(vectors);
  }

  /**
   * Transform vectors using fitted PCA model
   */
  transform(vectors: number[][]): number[][] {
    if (!this.components || !this.mean) {
      throw new Error('PCA model not fitted. Call fitTransform first.');
    }

    return vectors.map(v => {
      const centered = v.map((val, idx) => val - this.mean![idx]);
      return this.components!.map(component => {
        let projection = 0;
        for (let i = 0; i < centered.length; i++) {
          projection += centered[i] * component[i];
        }
        return projection;
      });
    });
  }

  /**
   * Get explained variance ratio for each component
   */
  getExplainedVarianceRatio(): number[] {
    if (!this.explainedVariance) {
      throw new Error('PCA model not fitted.');
    }
    const total = this.explainedVariance.reduce((sum, val) => sum + val, 0);
    return this.explainedVariance.map(val => val / total);
  }

  /**
   * Compute covariance matrix
   */
  private computeCovariance(centeredVectors: number[][]): number[][] {
    const n = centeredVectors.length;
    const d = centeredVectors[0].length;
    const covariance: number[][] = Array(d).fill(0).map(() => Array(d).fill(0));

    for (let i = 0; i < d; i++) {
      for (let j = i; j < d; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += centeredVectors[k][i] * centeredVectors[k][j];
        }
        covariance[i][j] = sum / (n - 1);
        covariance[j][i] = covariance[i][j]; // Symmetric
      }
    }

    return covariance;
  }

  /**
   * Power iteration method for finding dominant eigenvectors
   * Simplified implementation for top-k eigenvectors
   */
  private powerIteration(matrix: number[][], k: number, maxIter: number = 100): {
    vectors: number[][];
    values: number[];
  } {
    const n = matrix.length;
    const vectors: number[][] = [];
    const values: number[] = [];

    // Create a copy of the matrix to deflate
    let A = matrix.map(row => [...row]);

    for (let comp = 0; comp < k; comp++) {
      // Random initialization
      let v = Array(n).fill(0).map(() => Math.random() - 0.5);

      // Normalize
      let norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
      v = v.map(val => val / norm);

      // Power iteration
      for (let iter = 0; iter < maxIter; iter++) {
        // Matrix-vector multiplication
        const Av = A.map(row =>
          row.reduce((sum, val, idx) => sum + val * v[idx], 0)
        );

        // Normalize
        norm = Math.sqrt(Av.reduce((sum, val) => sum + val * val, 0));
        const vNew = Av.map(val => val / norm);

        // Check convergence
        const diff = v.reduce((sum, val, idx) => sum + Math.abs(val - vNew[idx]), 0);
        v = vNew;

        if (diff < 1e-6) break;
      }

      // Compute eigenvalue: λ = v^T A v
      const Av = A.map(row =>
        row.reduce((sum, val, idx) => sum + val * v[idx], 0)
      );
      const eigenvalue = v.reduce((sum, val, idx) => sum + val * Av[idx], 0);

      vectors.push(v);
      values.push(Math.abs(eigenvalue));

      // Deflate matrix: A = A - λvv^T
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          A[i][j] -= eigenvalue * v[i] * v[j];
        }
      }
    }

    return { vectors, values };
  }
}

/**
 * UMAP (Simplified implementation)
 * Note: Full UMAP is complex. This is a simplified version focusing on local structure preservation.
 * For production, consider using a proper UMAP library like umap-js.
 */
export class SimplifiedUMAP {
  private nNeighbors: number;
  private minDist: number;
  private nComponents: number;

  constructor(
    nNeighbors: number = 15,
    minDist: number = 0.1,
    nComponents: number = 15
  ) {
    this.nNeighbors = nNeighbors;
    this.minDist = minDist;
    this.nComponents = nComponents;
  }

  /**
   * Simplified UMAP using local linear embedding approach
   * This is a lightweight approximation of UMAP that preserves local structure
   */
  fitTransform(vectors: number[][]): number[][] {
    const n = vectors.length;

    // Find k-nearest neighbors for each point
    const neighbors = this.findKNN(vectors, this.nNeighbors);

    // Create a weighted graph based on distances
    const weights = this.computeWeights(vectors, neighbors);

    // Initialize embedding with PCA
    const pca = new PCA();
    const embedding = pca.fitTransform(vectors, this.nComponents);

    // Optimize embedding using force-directed layout
    return this.optimizeEmbedding(embedding, neighbors, weights);
  }

  /**
   * Find k-nearest neighbors for each point
   */
  private findKNN(vectors: number[][], k: number): number[][] {
    const n = vectors.length;
    const neighbors: number[][] = [];

    for (let i = 0; i < n; i++) {
      const distances: Array<{ index: number; distance: number }> = [];

      for (let j = 0; j < n; j++) {
        if (i === j) continue;

        let dist = 0;
        for (let d = 0; d < vectors[i].length; d++) {
          const diff = vectors[i][d] - vectors[j][d];
          dist += diff * diff;
        }
        dist = Math.sqrt(dist);

        distances.push({ index: j, distance: dist });
      }

      // Sort by distance and take k nearest
      distances.sort((a, b) => a.distance - b.distance);
      neighbors.push(distances.slice(0, k).map(d => d.index));
    }

    return neighbors;
  }

  /**
   * Compute weights for neighbor connections
   */
  private computeWeights(vectors: number[][], neighbors: number[][]): number[][] {
    const n = vectors.length;
    const weights: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      const neighborIndices = neighbors[i];

      // Compute distances to neighbors
      const distances = neighborIndices.map(j => {
        let dist = 0;
        for (let d = 0; d < vectors[i].length; d++) {
          const diff = vectors[i][d] - vectors[j][d];
          dist += diff * diff;
        }
        return Math.sqrt(dist);
      });

      // Use exponential decay for weights
      const sigma = distances[0] + 1e-8; // Use nearest neighbor distance as bandwidth

      neighborIndices.forEach((j, idx) => {
        const weight = Math.exp(-distances[idx] / sigma);
        weights[i][j] = weight;
        weights[j][i] = weight; // Symmetric
      });
    }

    return weights;
  }

  /**
   * Optimize embedding using force-directed layout
   */
  private optimizeEmbedding(
    embedding: number[][],
    neighbors: number[][],
    weights: number[][],
    nEpochs: number = 200,
    learningRate: number = 1.0
  ): number[][] {
    const n = embedding.length;
    const dim = embedding[0].length;

    // Create a copy to modify
    const optimized = embedding.map(v => [...v]);

    for (let epoch = 0; epoch < nEpochs; epoch++) {
      const alpha = learningRate * (1 - epoch / nEpochs); // Decay learning rate

      // Compute gradients for each point
      for (let i = 0; i < n; i++) {
        const grad = Array(dim).fill(0);

        // Attractive forces from neighbors
        for (const j of neighbors[i]) {
          const weight = weights[i][j];

          for (let d = 0; d < dim; d++) {
            const diff = optimized[j][d] - optimized[i][d];
            grad[d] += weight * diff;
          }
        }

        // Repulsive forces from random samples (simplified)
        const nSamples = 5;
        for (let s = 0; s < nSamples; s++) {
          const j = Math.floor(Math.random() * n);
          if (i === j) continue;

          let dist = 0;
          for (let d = 0; d < dim; d++) {
            const diff = optimized[i][d] - optimized[j][d];
            dist += diff * diff;
          }
          dist = Math.sqrt(dist) + 1e-8;

          const repulsion = this.minDist / (dist * nSamples);

          for (let d = 0; d < dim; d++) {
            const diff = optimized[i][d] - optimized[j][d];
            grad[d] -= repulsion * diff / dist;
          }
        }

        // Apply gradient update
        for (let d = 0; d < dim; d++) {
          optimized[i][d] += alpha * grad[d];
        }
      }
    }

    return optimized;
  }
}

/**
 * Factory function to create appropriate dimensionality reduction method
 */
export function createDimensionalityReducer(
  method: 'pca' | 'umap',
  targetDimensions?: number
): PCA | SimplifiedUMAP {
  if (method === 'pca') {
    const dims = targetDimensions || 40; // Default 30-50 range, using 40
    return new PCA();
  } else {
    const dims = targetDimensions || 15; // Default 10-20 range, using 15
    return new SimplifiedUMAP(15, 0.1, dims);
  }
}

/**
 * Apply dimensionality reduction with reporting
 */
export function reduceDimensionality(
  vectors: number[][],
  method: 'pca' | 'umap' = 'pca',
  targetDimensions?: number,
  verbose: boolean = true
): number[][] {
  const originalDim = vectors[0].length;

  if (method === 'pca') {
    const dims = targetDimensions || 40;
    const pca = new PCA();
    const reduced = pca.fitTransform(vectors, dims);

    if (verbose) {
      const variance = pca.getExplainedVarianceRatio();
      const totalVariance = variance.reduce((sum, v) => sum + v, 0);
      console.log(`PCA: ${originalDim}D → ${dims}D`);
      console.log(`Explained variance: ${(totalVariance * 100).toFixed(2)}%`);
    }

    return reduced;
  } else {
    const dims = targetDimensions || 15;
    const umap = new SimplifiedUMAP(15, 0.1, dims);
    const reduced = umap.fitTransform(vectors);

    if (verbose) {
      console.log(`UMAP: ${originalDim}D → ${dims}D`);
      console.log(`Preserving local structure with ${15} neighbors`);
    }

    return reduced;
  }
}
