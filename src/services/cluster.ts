/**
 * Deterministic DBSCAN-like clustering for numeric vectors.
 *
 * - Uses cosine distance (1 - cosine similarity).
 * - Deterministic: iteration order is stable (ascending indices), no randomness.
 * - Returns an array of integer labels aligned with input vectors.
 *   - Cluster labels are 0..(k-1)
 *   - Noise points are labeled -1
 */
export function clusterVectors(
  vectors: number[][],
  distanceThreshold = 0.5,
  minPts = 2
): number[] {
  if (!vectors || vectors.length === 0) return [];

  const n = vectors.length;

  // Precompute norms for cosine distance
  const norms = vectors.map(v => {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    return Math.sqrt(s);
  });

  function cosineDistance(aIdx: number, bIdx: number): number {
    const a = vectors[aIdx];
    const b = vectors[bIdx];
    const na = norms[aIdx];
    const nb = norms[bIdx];
    if (na === 0 || nb === 0) return 1; // max distance when a zero-vector present
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    const cos = dot / (na * nb);
    // numerical safety
    const clipped = Math.max(-1, Math.min(1, cos));
    return 1 - clipped;
  }

  // Region query: deterministic neighbor ordering (ascending indices)
  function regionQuery(idx: number): number[] {
    const neighbors: number[] = [];
    for (let j = 0; j < n; j++) {
      const d = cosineDistance(idx, j);
      if (d <= distanceThreshold) neighbors.push(j);
    }
    return neighbors;
  }

  const UNVISITED = 0;
  const NOISE = -1;

  // internal labels: 0 = unvisited, NOISE = -1, >=1 = cluster id
  const labelsInternal = new Array<number>(n).fill(UNVISITED);
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labelsInternal[i] !== UNVISITED) continue;

    const neighbors = regionQuery(i);
    if (neighbors.length < minPts) {
      labelsInternal[i] = NOISE;
      continue;
    }

    clusterId += 1; // start a new cluster (1-based)
    labelsInternal[i] = clusterId;

    // expand cluster using a queue; deterministic because neighbors are ascending
    const queue = neighbors.slice();
    // ensure the seed point is processed but avoid duplicate work
    let qIndex = 0;
    while (qIndex < queue.length) {
      const j = queue[qIndex];
      if (labelsInternal[j] === NOISE) {
        labelsInternal[j] = clusterId;
      }
      if (labelsInternal[j] === UNVISITED) {
        labelsInternal[j] = clusterId;
        const neighJ = regionQuery(j);
        if (neighJ.length >= minPts) {
          // Append neighbors deterministically; avoid duplicates by simple push
          for (let k = 0; k < neighJ.length; k++) {
            const idx = neighJ[k];
            // Only add if not already in queue. This keeps determinism and correctness.
            if (!queue.includes(idx)) queue.push(idx);
          }
        }
      }
      qIndex += 1;
    }
  }

  // Map internal cluster ids (1..k) to 0..k-1, keep NOISE as -1
  const mapping = new Map<number, number>();
  let nextLabel = 0;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const v = labelsInternal[i];
    if (v === NOISE) {
      out[i] = NOISE;
    } else {
      if (!mapping.has(v)) {
        mapping.set(v, nextLabel);
        nextLabel += 1;
      }
      out[i] = mapping.get(v)!;
    }
  }

  return out;
}

export default clusterVectors;

interface Article {
  id: number;
  title: string;
  content: string;
}

/**
 * Generates human-readable labels for clusters based on common terms in article titles.
 * @param articles Array of articles with id, title, and content
 * @param clusterLabels Array of cluster labels corresponding to each article
 * @returns Object mapping cluster IDs to descriptive labels
 */
export function labelClusters(articles: Article[], clusterLabels: number[]): { [key: string]: string } {
  const labels: { [key: string]: string } = {};
  
  // Group articles by cluster
  const clusters = new Map<number, Article[]>();
  articles.forEach((article, index) => {
    const clusterId = clusterLabels[index];
    if (clusterId !== -1) { // Skip noise points
      if (!clusters.has(clusterId)) {
        clusters.set(clusterId, []);
      }
      clusters.get(clusterId)!.push(article);
    }
  });

  // Process each cluster to generate labels
  for (const [clusterId, clusterArticles] of clusters) {
    // Extract words from titles, convert to lowercase
    const words = clusterArticles
      .flatMap(article => article.title.toLowerCase().split(/\W+/))
      .filter(word => word.length > 2) // Filter out short words
      .filter(word => !commonStopWords.includes(word)); // Filter out stop words

    // Count word frequencies
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Sort words by frequency and get top 2 most common words
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([word]) => word);

    // Generate label
    labels[clusterId.toString()] = topWords.length > 0 
      ? topWords.join(' & ').replace(/\b\w/g, c => c.toUpperCase()) // Capitalize first letter of each word
      : `Cluster ${clusterId}`; // Fallback label if no common words found
  }

  return labels;
}

// Common stop words to filter out
const commonStopWords = [
  'the', 'and', 'for', 'in', 'on', 'at', 'to', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'over', 'after', 'latest', 'new',
  'a', 'an', 'this', 'that', 'these', 'those', 'some', 'all', 'any',
  'each', 'every', 'who', 'which', 'what', 'whose', 'whom', 'when',
  'where', 'why', 'how', 'are', 'was', 'were', 'been', 'being', 'have',
  'has', 'had', 'does', 'did', 'doing', 'would', 'should', 'could',
  'might', 'must', 'will', 'shall'
];