import { describe, it, expect } from 'vitest';
import { SemanticVectorize } from '../src/services/semanticVectorize';
import { labelClusters } from '../src/services/cluster';
import {
  KMeansStrategy,
  HierarchicalStrategy,
  AffinityPropagationStrategy,
  AdaptiveDBSCANStrategy
} from '../src/services/clusterStrategies';
import { GridSearchTuner } from '../src/services/clusterTuning';
import { realArticles } from './mocks/real-articles-simple';

describe('Semantic Embeddings Real Data Evaluation', () => {
  it('should compare all strategies with semantic embeddings on real 30 articles', async () => {
    console.log('\n========================================');
    console.log('SEMANTIC EMBEDDINGS - COMPREHENSIVE EVALUATION');
    console.log('========================================\n');

    // Vectorize with semantic embeddings
    const vectorizer = new SemanticVectorize();
    const vectorizedArticles = await vectorizer.vectorizeArticles(realArticles as any);
    const vectors = vectorizedArticles.map(article => article.vector);

    console.log(`Total articles: ${realArticles.length}`);
    console.log(`Vector dimensions: ${vectors[0].length}\n`);

    const tuner = new GridSearchTuner({
      verbose: true,
      scoringWeights: {
        silhouette: 0.5,
        daviesBouldin: 0.3,
        numClusters: 0.2
      }
    });

    // Test all strategies with comprehensive parameter grids
    const strategies = [
      {
        strategy: new KMeansStrategy(),
        paramGrid: {
          k: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15],
          maxIterations: [100],
          seed: [42]
        }
      },
      {
        strategy: new HierarchicalStrategy(),
        paramGrid: {
          numClusters: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15],
          linkage: ['single', 'average', 'complete']
        }
      },
      {
        strategy: new AffinityPropagationStrategy(),
        paramGrid: {
          damping: [0.5, 0.7, 0.9],
          maxIterations: [200]
        }
      },
      {
        strategy: new AdaptiveDBSCANStrategy(),
        paramGrid: {
          // For semantic embeddings (normalized vectors), cosine distance is typically in range 0-0.5
          // Most similar articles: ~0.1-0.3, dissimilar: ~0.4-0.8
          epsilon: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6],
          minPts: [1, 2, 3, 4, 5]
        }
      }
    ];

    console.log('\n========================================');
    console.log('COMPARING ALL STRATEGIES');
    console.log('========================================\n');

    const bestResult = tuner.compareStrategies(strategies, vectors);

    console.log('\n=== Top 5 Results ===');
    const allResults = strategies.flatMap(s => tuner.tune(s.strategy, vectors, s.paramGrid));
    const topResults = allResults.slice(0, 5);
    topResults.forEach((result, i) => {
      console.log(`${i + 1}. ${result.strategy} - Score: ${result.score.toFixed(3)}`);
      console.log(`   Params: ${JSON.stringify(result.params)}`);
      console.log(`   Silhouette: ${result.metrics.silhouetteScore.toFixed(3)}, DB Index: ${result.metrics.daviesBouldinIndex.toFixed(3)}, Clusters: ${result.metrics.numClusters}, Noise: ${result.metrics.numNoise}`);
    });

    console.log('\n========================================');
    console.log('BEST CLUSTERING RESULT');
    console.log('========================================');
    console.log(`Strategy: ${bestResult.strategy}`);
    console.log(`Parameters: ${JSON.stringify(bestResult.params)}`);
    console.log(`\nMetrics:`);
    console.log(`  Silhouette Score: ${bestResult.metrics.silhouetteScore.toFixed(4)}`);
    console.log(`  Davies-Bouldin Index: ${bestResult.metrics.daviesBouldinIndex.toFixed(4)}`);
    console.log(`  Number of Clusters: ${bestResult.metrics.numClusters}`);
    console.log(`  Number of Noise Points: ${bestResult.metrics.numNoise}`);
    console.log(`  Combined Score: ${bestResult.score.toFixed(4)}`);
    console.log(`\nCluster Sizes: [${bestResult.metrics.clusterSizes.join(', ')}]`);

    // Show cluster assignments
    const clusterNames = labelClusters(realArticles as any, bestResult.labels);

    console.log('\n========================================');
    console.log('CLUSTER ASSIGNMENTS');
    console.log('========================================\n');

    for (const [clusterId, clusterName] of Object.entries(clusterNames)) {
      const articlesInCluster = realArticles.filter((_, i) => bestResult.labels[i] === parseInt(clusterId));
      console.log(`\n📁 Cluster ${parseInt(clusterId) + 1}: "${clusterName}" (${articlesInCluster.length} articles)`);
      console.log('─'.repeat(60));
      articlesInCluster.forEach(article => {
        console.log(`  • ${article.title}`);
      });
    }

    console.log('\n========================================\n');

    expect(bestResult.metrics.silhouetteScore).toBeGreaterThan(-1);
    expect(bestResult.metrics.silhouetteScore).toBeLessThanOrEqual(1);
  }, 180000); // 3 minute timeout for comprehensive testing
});
