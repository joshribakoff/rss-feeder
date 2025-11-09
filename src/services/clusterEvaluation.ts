/**
 * Clustering evaluation utilities including silhouette score and other metrics
 */

/**
 * Calculate Euclidean distance between two vectors
 */
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculate cosine distance between two vectors (1 - cosine similarity)
 */
export function cosineDistance(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 1;

  const cosSim = dotProduct / (normA * normB);
  const clipped = Math.max(-1, Math.min(1, cosSim));
  return 1 - clipped;
}

/**
 * Calculate silhouette score for a single point
 * @param pointIdx Index of the point
 * @param vectors All vectors
 * @param labels Cluster labels for each vector
 * @param distanceFn Distance function to use
 */
function silhouettePoint(
  pointIdx: number,
  vectors: number[][],
  labels: number[],
  distanceFn: (a: number[], b: number[]) => number
): number {
  const clusterLabel = labels[pointIdx];

  // Skip noise points
  if (clusterLabel === -1) return 0;

  const point = vectors[pointIdx];

  // Calculate a(i): mean distance to points in same cluster
  const sameCluster = labels
    .map((label, idx) => ({ label, idx }))
    .filter(({ label, idx }) => label === clusterLabel && idx !== pointIdx);

  if (sameCluster.length === 0) return 0; // Single point cluster

  const a = sameCluster.reduce((sum, { idx }) => {
    return sum + distanceFn(point, vectors[idx]);
  }, 0) / sameCluster.length;

  // Calculate b(i): mean distance to nearest cluster
  const otherClusters = new Set(labels.filter(l => l !== clusterLabel && l !== -1));

  if (otherClusters.size === 0) return 0; // Only one cluster

  let minB = Infinity;
  for (const otherLabel of otherClusters) {
    const otherClusterPoints = labels
      .map((label, idx) => ({ label, idx }))
      .filter(({ label }) => label === otherLabel);

    const meanDist = otherClusterPoints.reduce((sum, { idx }) => {
      return sum + distanceFn(point, vectors[idx]);
    }, 0) / otherClusterPoints.length;

    minB = Math.min(minB, meanDist);
  }

  const b = minB;

  // Silhouette coefficient for this point
  return (b - a) / Math.max(a, b);
}

/**
 * Calculate average silhouette score for clustering
 * Range: [-1, 1], higher is better
 * @param vectors Array of feature vectors
 * @param labels Cluster labels for each vector
 * @param distanceMetric Distance metric to use ('euclidean' or 'cosine')
 */
export function silhouetteScore(
  vectors: number[][],
  labels: number[],
  distanceMetric: 'euclidean' | 'cosine' = 'cosine'
): number {
  if (vectors.length === 0 || vectors.length !== labels.length) {
    return 0;
  }

  const distanceFn = distanceMetric === 'cosine' ? cosineDistance : euclideanDistance;

  // Get unique clusters (excluding noise)
  const uniqueClusters = new Set(labels.filter(l => l !== -1));

  // Need at least 2 clusters for meaningful silhouette score
  if (uniqueClusters.size < 2) {
    return 0;
  }

  let totalScore = 0;
  let count = 0;

  for (let i = 0; i < vectors.length; i++) {
    if (labels[i] !== -1) { // Skip noise points
      totalScore += silhouettePoint(i, vectors, labels, distanceFn);
      count++;
    }
  }

  return count > 0 ? totalScore / count : 0;
}

/**
 * Calculate Davies-Bouldin Index (lower is better)
 * Measures average similarity between each cluster and its most similar cluster
 */
export function daviesBouldinIndex(vectors: number[][], labels: number[]): number {
  const uniqueClusters = Array.from(new Set(labels.filter(l => l !== -1)));

  if (uniqueClusters.length < 2) return 0;

  // Calculate centroids
  const centroids = new Map<number, number[]>();
  for (const cluster of uniqueClusters) {
    const clusterPoints = vectors.filter((_, i) => labels[i] === cluster);
    const dim = vectors[0].length;
    const centroid = new Array(dim).fill(0);

    for (const point of clusterPoints) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += point[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      centroid[i] /= clusterPoints.length;
    }

    centroids.set(cluster, centroid);
  }

  // Calculate average distance within each cluster
  const avgDistances = new Map<number, number>();
  for (const cluster of uniqueClusters) {
    const clusterPoints = vectors.filter((_, i) => labels[i] === cluster);
    const centroid = centroids.get(cluster)!;

    const avgDist = clusterPoints.reduce((sum, point) => {
      return sum + cosineDistance(point, centroid);
    }, 0) / clusterPoints.length;

    avgDistances.set(cluster, avgDist);
  }

  // Calculate DB index
  let dbIndex = 0;
  for (const i of uniqueClusters) {
    let maxRatio = 0;

    for (const j of uniqueClusters) {
      if (i !== j) {
        const centroidDist = cosineDistance(centroids.get(i)!, centroids.get(j)!);
        const ratio = (avgDistances.get(i)! + avgDistances.get(j)!) / centroidDist;
        maxRatio = Math.max(maxRatio, ratio);
      }
    }

    dbIndex += maxRatio;
  }

  return dbIndex / uniqueClusters.length;
}

/**
 * Evaluate clustering quality with multiple metrics
 */
export interface ClusterMetrics {
  silhouetteScore: number;
  daviesBouldinIndex: number;
  numClusters: number;
  numNoise: number;
  clusterSizes: number[];
}

export function evaluateClustering(
  vectors: number[][],
  labels: number[],
  distanceMetric: 'euclidean' | 'cosine' = 'cosine'
): ClusterMetrics {
  const uniqueClusters = new Set(labels.filter(l => l !== -1));
  const numNoise = labels.filter(l => l === -1).length;

  const clusterSizes = Array.from(uniqueClusters).map(cluster => {
    return labels.filter(l => l === cluster).length;
  });

  return {
    silhouetteScore: silhouetteScore(vectors, labels, distanceMetric),
    daviesBouldinIndex: daviesBouldinIndex(vectors, labels),
    numClusters: uniqueClusters.size,
    numNoise,
    clusterSizes
  };
}
