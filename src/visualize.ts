/**
 * Visualization script for clustering analysis
 * Exports article data and cluster labels for UMAP 2D visualization in Python
 */

import { DatabaseService } from './services/databaseService';
import { SemanticVectorize } from './services/semanticVectorize';
import { KMeansStrategy } from './services/clusterStrategies';
import { GridSearchTuner } from './services/clusterTuning';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';

type ArticleWithFeed = Prisma.ArticleGetPayload<{
  include: { feed: true }
}>;

// ========================================
// VISUALIZATION CONFIGURATION
// ========================================

// Dimensionality reduction configuration
const DIMENSIONALITY_REDUCTION = {
  enabled: true,
  method: 'pca' as 'pca' | 'umap',
  targetDimensions: 40
};

// Force k-means for cleaner visualization
const USE_KMEANS_ONLY = true;
const KMEANS_K = 5;

async function main() {
  const db = new DatabaseService();

  try {
    console.log('Loading articles from database...');
    const articles: ArticleWithFeed[] = await db.getAllArticles();

    if (articles.length === 0) {
      console.log('No articles found. Run the main scrape script first.');
      return;
    }

    console.log(`Found ${articles.length} articles`);

    // Vectorize articles
    console.log('Vectorizing articles...');
    const semanticProcessor = new SemanticVectorize();
    const vectorizedArticles = await semanticProcessor.vectorizeArticles(articles);
    const vectors = vectorizedArticles.map(article => article.vector);

    console.log(`Vector dimensions: ${vectors[0].length}`);

    // Cluster articles
    let clusterLabels: number[];

    if (USE_KMEANS_ONLY) {
      console.log(`\nUsing K-Means with k=${KMEANS_K}...`);

      const tuner = new GridSearchTuner({
        verbose: true,
        scoringWeights: {
          silhouette: 0.7,
          daviesBouldin: 0.2,
          numClusters: 0.1
        },
        dimensionalityReduction: DIMENSIONALITY_REDUCTION
      });

      const results = tuner.tune(
        new KMeansStrategy(),
        vectors,
        { k: [KMEANS_K], maxIterations: [100], seed: [42] }
      );

      clusterLabels = results[0].labels;

      console.log('\nClustering Results:');
      console.log(`Silhouette Score: ${results[0].metrics.silhouetteScore.toFixed(4)}`);
      console.log(`Davies-Bouldin Index: ${results[0].metrics.daviesBouldinIndex.toFixed(4)}`);
      console.log(`Number of Clusters: ${results[0].metrics.numClusters}`);
      console.log(`Cluster Sizes: [${results[0].metrics.clusterSizes.join(', ')}]`);
    } else {
      // Auto-tune all strategies
      console.log('\nAuto-tuning clustering strategies...');

      const tuner = new GridSearchTuner({
        verbose: true,
        scoringWeights: {
          silhouette: 0.7,
          daviesBouldin: 0.2,
          numClusters: 0.1
        },
        dimensionalityReduction: DIMENSIONALITY_REDUCTION
      });

      const strategies = [
        {
          strategy: new KMeansStrategy(),
          paramGrid: {
            k: [3, 5, 7, 10],
            maxIterations: [100],
            seed: [42]
          }
        }
      ];

      const bestResult = tuner.compareStrategies(strategies, vectors);
      clusterLabels = bestResult.labels;

      console.log('\nBest Clustering Results:');
      console.log(`Strategy: ${bestResult.strategy}`);
      console.log(`Parameters: ${JSON.stringify(bestResult.params)}`);
      console.log(`Silhouette Score: ${bestResult.metrics.silhouetteScore.toFixed(4)}`);
      console.log(`Davies-Bouldin Index: ${bestResult.metrics.daviesBouldinIndex.toFixed(4)}`);
    }

    // Export data for Python visualization
    console.log('\nExporting data for visualization...');

    const exportData = {
      articles: articles.map((article, idx) => ({
        title: article.title,
        description: article.description || '',
        link: article.link,
        feedTitle: article.feed.title,
        cluster: clusterLabels[idx],
        vector: vectors[idx]
      })),
      config: {
        vectorDimensions: vectors[0].length,
        numArticles: articles.length,
        numClusters: Math.max(...clusterLabels) + 1,
        dimensionalityReduction: DIMENSIONALITY_REDUCTION
      }
    };

    // Save to JSON file
    const outputPath = './cluster_data.json';
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`✓ Data exported to ${outputPath}`);

    // Print cluster preview
    console.log('\n========================================');
    console.log('CLUSTER PREVIEW');
    console.log('========================================');

    const clusterMap = new Map<number, ArticleWithFeed[]>();
    articles.forEach((article, idx) => {
      const cluster = clusterLabels[idx];
      if (!clusterMap.has(cluster)) {
        clusterMap.set(cluster, []);
      }
      clusterMap.get(cluster)!.push(article);
    });

    clusterMap.forEach((clusterArticles, clusterId) => {
      console.log(`\nCluster ${clusterId} (${clusterArticles.length} articles):`);
      clusterArticles.slice(0, 3).forEach(article => {
        console.log(`  - ${article.title} (${article.feed.title})`);
      });
      if (clusterArticles.length > 3) {
        console.log(`  ... and ${clusterArticles.length - 3} more`);
      }
    });

    console.log('\n========================================');
    console.log('Next steps:');
    console.log('1. Run: jupyter notebook');
    console.log('2. Open: visualize_clusters.ipynb');
    console.log('========================================');

  } catch (error) {
    console.error('Visualization error:', error);
  } finally {
    await db.disconnect();
  }
}

main().catch(console.error);
