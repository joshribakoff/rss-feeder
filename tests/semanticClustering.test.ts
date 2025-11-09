import { describe, it, expect } from 'vitest';
import { Vectorize } from '../src/services/vectorize';
import { SemanticVectorize } from '../src/services/semanticVectorize';
import { HierarchicalStrategy, KMeansStrategy } from '../src/services/clusterStrategies';
import { evaluateClustering } from '../src/services/clusterEvaluation';
import { labelClusters } from '../src/services/cluster';
import { realArticles } from './mocks/real-articles-simple';

describe('Semantic Embeddings vs TF-IDF Comparison', () => {
  it('should compare clustering quality between TF-IDF and semantic embeddings', async () => {
    console.log('\n========================================');
    console.log('COMPARING TF-IDF VS SEMANTIC EMBEDDINGS');
    console.log('========================================\n');

    // 1. TF-IDF Vectorization
    console.log('1. Testing TF-IDF vectorization...');
    const tfidfVectorizer = new Vectorize();
    const tfidfVectorized = tfidfVectorizer.vectorizeArticles(realArticles as any);
    const tfidfVectors = tfidfVectorized.map(a => a.vector);

    const tfidfStrategy = new HierarchicalStrategy();
    const tfidfLabels = tfidfStrategy.cluster(tfidfVectors, { numClusters: 5, linkage: 'average' });
    const tfidfMetrics = evaluateClustering(tfidfVectors, tfidfLabels);

    console.log('\nTF-IDF Results:');
    console.log(`  Vector dimensions: ${tfidfVectors[0].length}`);
    console.log(`  Silhouette Score: ${tfidfMetrics.silhouetteScore.toFixed(4)}`);
    console.log(`  Davies-Bouldin Index: ${tfidfMetrics.daviesBouldinIndex.toFixed(4)}`);
    console.log(`  Number of Clusters: ${tfidfMetrics.numClusters}`);
    console.log(`  Cluster Sizes: [${tfidfMetrics.clusterSizes.join(', ')}]`);

    // 2. Semantic Embeddings
    console.log('\n2. Testing semantic embeddings...');
    const semanticVectorizer = new SemanticVectorize();
    const semanticVectorized = await semanticVectorizer.vectorizeArticles(realArticles as any);
    const semanticVectors = semanticVectorized.map(a => a.vector);

    const semanticStrategy = new HierarchicalStrategy();
    const semanticLabels = semanticStrategy.cluster(semanticVectors, { numClusters: 5, linkage: 'average' });
    const semanticMetrics = evaluateClustering(semanticVectors, semanticLabels);

    console.log('\nSemantic Embeddings Results:');
    console.log(`  Vector dimensions: ${semanticVectors[0].length}`);
    console.log(`  Silhouette Score: ${semanticMetrics.silhouetteScore.toFixed(4)}`);
    console.log(`  Davies-Bouldin Index: ${semanticMetrics.daviesBouldinIndex.toFixed(4)}`);
    console.log(`  Number of Clusters: ${semanticMetrics.numClusters}`);
    console.log(`  Cluster Sizes: [${semanticMetrics.clusterSizes.join(', ')}]`);

    // 3. Show cluster assignments
    console.log('\n========================================');
    console.log('SEMANTIC EMBEDDINGS CLUSTER ASSIGNMENTS');
    console.log('========================================\n');

    const clusterNames = labelClusters(realArticles as any, semanticLabels);
    for (const [clusterId, clusterName] of Object.entries(clusterNames)) {
      const articlesInCluster = realArticles.filter((_, i) => semanticLabels[i] === parseInt(clusterId));
      console.log(`\nCluster ${parseInt(clusterId) + 1}: "${clusterName}" (${articlesInCluster.length} articles)`);
      console.log('─'.repeat(60));
      articlesInCluster.forEach(article => {
        console.log(`  • ${article.title}`);
      });
    }

    // 4. Comparison
    console.log('\n========================================');
    console.log('COMPARISON SUMMARY');
    console.log('========================================\n');

    const silhouetteImprovement = ((semanticMetrics.silhouetteScore - tfidfMetrics.silhouetteScore) / Math.abs(tfidfMetrics.silhouetteScore) * 100);
    const dbImprovement = ((tfidfMetrics.daviesBouldinIndex - semanticMetrics.daviesBouldinIndex) / tfidfMetrics.daviesBouldinIndex * 100);

    console.log(`Silhouette Score Improvement: ${silhouetteImprovement > 0 ? '+' : ''}${silhouetteImprovement.toFixed(1)}%`);
    console.log(`Davies-Bouldin Improvement: ${dbImprovement > 0 ? '+' : ''}${dbImprovement.toFixed(1)}% (lower is better)`);

    if (semanticMetrics.silhouetteScore > tfidfMetrics.silhouetteScore) {
      console.log('\n✅ Semantic embeddings produce BETTER clustering!');
    } else {
      console.log('\n❌ TF-IDF performed better (unusual)');
    }

    console.log('\n========================================\n');

    // Assertions
    expect(semanticMetrics.silhouetteScore).toBeGreaterThan(-1);
    expect(semanticMetrics.silhouetteScore).toBeLessThanOrEqual(1);
    expect(semanticVectors[0].length).toBeGreaterThan(0);
  }, 120000); // 2 minute timeout for model loading

  it('should test K-means with semantic embeddings', async () => {
    const semanticVectorizer = new SemanticVectorize();
    const semanticVectorized = await semanticVectorizer.vectorizeArticles(realArticles as any);
    const semanticVectors = semanticVectorized.map(a => a.vector);

    const strategy = new KMeansStrategy();
    const labels = strategy.cluster(semanticVectors, { k: 5, seed: 42 });
    const metrics = evaluateClustering(semanticVectors, labels);

    console.log('\nK-Means with Semantic Embeddings:');
    console.log(`  Silhouette Score: ${metrics.silhouetteScore.toFixed(4)}`);
    console.log(`  Cluster Sizes: [${metrics.clusterSizes.join(', ')}]`);

    expect(metrics.numClusters).toBe(5);
  }, 120000);
});
