declare module 'node-kmeans' {
  interface KMeansOptions {
    k: number;
    debug?: boolean;
  }

  interface KMeansResult {
    clusters: number[][];
    centroid: number[];
    iterations: number;
  }

  export function clusterize(
    vectors: number[][],
    options: KMeansOptions,
    callback: (error: Error | null, result: KMeansResult) => void
  ): void;
}