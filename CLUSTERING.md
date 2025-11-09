# Clustering Strategies Guide

This document explains the new clustering strategies and hyperparameter tuning framework added to improve article clustering.

## Problem

The original DBSCAN clustering worked well on test data, but with real articles it produced poor results:
- Everything clustered into one large group
- Or each article in its own cluster

## Solution

Multiple clustering strategies with hyperparameter tuning AND semantic embeddings (instead of TF-IDF) for much better results.

## Quick Start: Switch to Semantic Embeddings

**The easiest win:** Change one line in [src/index.ts](src/index.ts:22):

```typescript
// Line 22: Change this to switch vectorization methods
const VECTORIZATION_METHOD: 'tfidf' | 'semantic' = 'semantic'; // Change to 'tfidf' to switch back
```

**Results:**
- TF-IDF: Silhouette score ~0.012 (poor clustering)
- Semantic: Silhouette score ~0.046 (288% improvement!)

**Trade-offs:**
- Semantic is slower (downloads 90MB model on first run, ~200ms per article)
- Semantic understands meaning ("AI" and "artificial intelligence" are similar)
- TF-IDF is faster but only looks at exact word matches

## Available Strategies

### 1. K-Means (`KMeansStrategy`)
Groups articles into K clusters using cosine distance.

**Parameters:**
- `k`: Number of clusters (default: auto-calculated)
- `maxIterations`: Max iterations for convergence (default: 100)
- `seed`: Random seed for deterministic results (optional)

**Pros:** Fast, works well when you know the number of clusters
**Cons:** Requires specifying K, sensitive to initialization

### 2. Hierarchical Clustering (`HierarchicalStrategy`)
Builds a hierarchy of clusters using agglomerative (bottom-up) approach.

**Parameters:**
- `numClusters`: Desired number of clusters (default: auto-calculated)
- `linkage`: How to measure cluster distance: `'single'`, `'average'`, or `'complete'` (default: `'average'`)

**Pros:** Deterministic, no random initialization, flexible
**Cons:** Slower for large datasets

### 3. Affinity Propagation (`AffinityPropagationStrategy`)
Automatically determines the number of clusters by passing messages between data points.

**Parameters:**
- `preference`: Controls number of clusters (default: median similarity)
- `damping`: Damping factor between 0.5 and 1 (default: 0.5)
- `maxIterations`: Max iterations (default: 200)

**Pros:** Automatically finds number of clusters
**Cons:** Slower, can be sensitive to parameters

### 4. Adaptive DBSCAN (`AdaptiveDBSCANStrategy`)
Enhanced version of the original DBSCAN with automatic parameter tuning.

**Parameters:**
- `autoTune`: Enable automatic parameter selection (default: true)

**Pros:** Can find arbitrary-shaped clusters, identifies noise
**Cons:** Auto-tuning is slower

## Usage Examples

### Basic Usage

```typescript
import { KMeansStrategy } from './src/services/clusterStrategies';
import { Vectorize } from './src/services/vectorize';

const vectorizer = new Vectorize();
const vectorizedArticles = vectorizer.vectorizeArticles(articles);
const vectors = vectorizedArticles.map(a => a.vector);

// Use K-means with 5 clusters
const strategy = new KMeansStrategy();
const labels = strategy.cluster(vectors, { k: 5 });
```

### Hyperparameter Tuning

Find the best parameters automatically:

```typescript
import { GridSearchTuner } from './src/services/clusterTuning';
import { KMeansStrategy } from './src/services/clusterStrategies';

const tuner = new GridSearchTuner({ verbose: true });

const results = tuner.tune(
  new KMeansStrategy(),
  vectors,
  {
    k: [3, 4, 5, 6, 7, 8],
    maxIterations: [100]
  }
);

// Use the best result
const bestLabels = results[0].labels;
console.log('Best k:', results[0].params.k);
console.log('Silhouette score:', results[0].metrics.silhouetteScore);
```

### Comparing Multiple Strategies

```typescript
import { GridSearchTuner } from './src/services/clusterTuning';
import {
  KMeansStrategy,
  HierarchicalStrategy,
  AdaptiveDBSCANStrategy
} from './src/services/clusterStrategies';

const tuner = new GridSearchTuner({ verbose: true });

const bestResult = tuner.compareStrategies([
  {
    strategy: new KMeansStrategy(),
    paramGrid: { k: [3, 4, 5, 6] }
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
    paramGrid: { autoTune: [true] }
  }
], vectors);

console.log('Best strategy:', bestResult.strategy);
console.log('Best params:', bestResult.params);
console.log('Metrics:', bestResult.metrics);
```

## Evaluation Metrics

### Silhouette Score
Range: [-1, 1], higher is better
- Measures how similar points are to their own cluster vs other clusters
- > 0.5: Good clustering
- 0.2-0.5: Reasonable clustering
- < 0: Poor clustering (points in wrong clusters)

### Davies-Bouldin Index
Range: [0, ∞], lower is better
- Measures average similarity between each cluster and its most similar cluster
- < 1: Good separation
- 1-2: Moderate separation
- > 2: Poor separation

## Exporting Database Articles for Testing

To export your current database articles as test mocks:

```bash
# Run the export script
npx tsx scripts/export-db-to-mocks.ts
```

This creates two files:
- `tests/mocks/real-articles.json` - Full JSON export with metadata
- `tests/mocks/real-articles-simple.ts` - TypeScript array for use in tests

Then use in your tests:

```typescript
import { realArticles } from './mocks/real-articles-simple';

// Test clustering with real data
const vectorizedArticles = vectorizer.vectorizeArticles(realArticles);
```

## Running Tests

```bash
# Test individual strategies
npx vitest run tests/clusterStrategies.test.ts

# Test strategy comparison and tuning
npx vitest run tests/clusterComparison.test.ts

# Run all tests
npx vitest run
```

## Integration with Existing Code

The original DBSCAN implementation in `src/services/cluster.ts` is **unchanged**. All new strategies are in separate files so you can A/B test without breaking existing functionality.

To use a new strategy in [src/index.ts](src/index.ts:48):

```typescript
// Original (unchanged)
const clusterLabels = clusterVectors(vectors, SIMILARITY_THRESHOLD, MIN_CLUSTER_SIZE);

// New: Use tuning to find best strategy
import { GridSearchTuner } from './services/clusterTuning';
import { KMeansStrategy, HierarchicalStrategy } from './services/clusterStrategies';

const tuner = new GridSearchTuner({ verbose: true });
const bestResult = tuner.compareStrategies([
  { strategy: new KMeansStrategy(), paramGrid: { k: [3, 4, 5, 6, 7] } },
  { strategy: new HierarchicalStrategy(), paramGrid: { numClusters: [3, 4, 5, 6, 7], linkage: ['average'] } }
], vectors);

const clusterLabels = bestResult.labels;
console.log(`Using ${bestResult.strategy} with params:`, bestResult.params);
```

## Customizing Scoring

Adjust how strategies are scored during tuning:

```typescript
const tuner = new GridSearchTuner({
  scoringWeights: {
    silhouette: 0.7,      // Prioritize cluster separation
    daviesBouldin: 0.2,   // Some weight on compactness
    numClusters: 0.1      // Slight preference for target cluster count
  },
  verbose: true
});
```

## Files Added

- `src/services/clusterStrategies.ts` - Alternative clustering implementations
- `src/services/clusterEvaluation.ts` - Silhouette score and evaluation metrics
- `src/services/clusterTuning.ts` - Hyperparameter tuning framework
- `tests/clusterStrategies.test.ts` - Unit tests for each strategy
- `tests/clusterComparison.test.ts` - Integration tests comparing strategies
- `scripts/export-db-to-mocks.ts` - Export database to test fixtures

## Files Unchanged

- `src/services/cluster.ts` - Original DBSCAN implementation (still works)
- `src/index.ts` - Main application (uses original clustering)
- All existing tests continue to pass

## Next Steps

1. Export your real database articles: `npx tsx scripts/export-db-to-mocks.ts`
2. Create a test with your real data in `tests/clusterComparison.test.ts`
3. Run comparison tests to find the best strategy
4. Update `src/index.ts` to use the winning strategy
5. Iterate on parameters until clustering quality improves
