import { describe, it, expect } from 'vitest';
import { Vectorize } from '../src/services/vectorize';
import { labelClusters } from '../src/services/cluster';
import {
  KMeansStrategy,
  HierarchicalStrategy,
  AffinityPropagationStrategy,
  AdaptiveDBSCANStrategy
} from '../src/services/clusterStrategies';
import { GridSearchTuner } from '../src/services/clusterTuning';
import { realArticles } from './mocks/real-articles-simple';

describe('Real Database Articles Clustering Evaluation', () => {
  it('should compare all strategies on real 30 articles from database', () => {
    console.log('\n========================================');
    console.log('EVALUATING CLUSTERING ON 30 REAL ARTICLES');
    console.log('========================================\n');

    // Vectorize the real articles
    const vectorizer = new Vectorize();
    const vectorizedArticles = vectorizer.vectorizeArticles(realArticles as any);
    const vectors = vectorizedArticles.map(article => article.vector);

    console.log(`Total articles: ${realArticles.length}`);
    console.log(`Vector dimensions: ${vectors[0].length}\n`);

    // Show sample titles
    console.log('Sample article titles:');
    realArticles.slice(0, 5).forEach((article, idx) => {
      console.log(`  ${idx + 1}. ${article.title}`);
    });
    console.log('');

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
          seed: [42] // Use seed for reproducibility
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
          // Cosine distance for normalized vectors: 0 (identical) to 2 (opposite)
          // Fine-grained sweep around the critical range
          epsilon: [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8],
          minPts: [1, 2, 3, 4, 5, 6, 7]
        }
      }
    ];

    console.log('\n========================================');
    console.log('COMPARING ALL STRATEGIES');
    console.log('========================================\n');

    const bestResult = tuner.compareStrategies(strategies, vectors);

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

    // Generate cluster labels
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

    // Show noise points if any
    const noiseArticles = realArticles.filter((_, i) => bestResult.labels[i] === -1);
    if (noiseArticles.length > 0) {
      console.log(`\n🔹 Noise/Outliers (${noiseArticles.length} articles)`);
      console.log('─'.repeat(60));
      noiseArticles.forEach(article => {
        console.log(`  • ${article.title}`);
      });
    }

    console.log('\n========================================\n');

    // Assertions
    expect(bestResult).toBeDefined();
    expect(bestResult.metrics.numClusters).toBeGreaterThan(0);
    expect(bestResult.metrics.numClusters).toBeLessThan(realArticles.length); // Should not be one per article
  });

  it('should show detailed comparison of top 3 strategies', () => {
    const vectorizer = new Vectorize();
    const vectorizedArticles = vectorizer.vectorizeArticles(realArticles as any);
    const vectors = vectorizedArticles.map(article => article.vector);

    const tuner = new GridSearchTuner({ verbose: false });

    // Test key strategies
    const kMeansResults = tuner.tune(new KMeansStrategy(), vectors, {
      k: [3, 4, 5, 6, 7, 8],
      seed: [42]
    });

    const hierarchicalResults = tuner.tune(new HierarchicalStrategy(), vectors, {
      numClusters: [3, 4, 5, 6, 7, 8],
      linkage: ['average']
    });

    const dbscanResults = tuner.tune(new AdaptiveDBSCANStrategy(), vectors, {
      autoTune: [true]
    });

    console.log('\n========================================');
    console.log('DETAILED STRATEGY COMPARISON');
    console.log('========================================\n');

    console.log('K-Means Best Result:');
    console.log(`  k=${kMeansResults[0].params.k}`);
    console.log(`  Silhouette: ${kMeansResults[0].metrics.silhouetteScore.toFixed(4)}`);
    console.log(`  DB Index: ${kMeansResults[0].metrics.daviesBouldinIndex.toFixed(4)}`);
    console.log(`  Clusters: ${kMeansResults[0].metrics.numClusters}`);
    console.log(`  Sizes: [${kMeansResults[0].metrics.clusterSizes.join(', ')}]`);

    console.log('\nHierarchical Best Result:');
    console.log(`  numClusters=${hierarchicalResults[0].params.numClusters}`);
    console.log(`  Silhouette: ${hierarchicalResults[0].metrics.silhouetteScore.toFixed(4)}`);
    console.log(`  DB Index: ${hierarchicalResults[0].metrics.daviesBouldinIndex.toFixed(4)}`);
    console.log(`  Clusters: ${hierarchicalResults[0].metrics.numClusters}`);
    console.log(`  Sizes: [${hierarchicalResults[0].metrics.clusterSizes.join(', ')}]`);

    console.log('\nAdaptive DBSCAN Result:');
    console.log(`  Silhouette: ${dbscanResults[0].metrics.silhouetteScore.toFixed(4)}`);
    console.log(`  DB Index: ${dbscanResults[0].metrics.daviesBouldinIndex.toFixed(4)}`);
    console.log(`  Clusters: ${dbscanResults[0].metrics.numClusters}`);
    console.log(`  Noise: ${dbscanResults[0].metrics.numNoise}`);
    console.log(`  Sizes: [${dbscanResults[0].metrics.clusterSizes.join(', ')}]`);

    console.log('\n========================================\n');
  });
});
