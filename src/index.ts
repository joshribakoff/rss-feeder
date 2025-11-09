import { DatabaseService } from './services/databaseService';
import { Vectorize } from './services/vectorize';
import { SemanticVectorize } from './services/semanticVectorize';
import { labelClusters } from './services/cluster';
import {
  KMeansStrategy,
  HierarchicalStrategy,
  AffinityPropagationStrategy,
  AdaptiveDBSCANStrategy
} from './services/clusterStrategies';
import { GridSearchTuner } from './services/clusterTuning';
import { fetchFeed, parseFeedContent } from './services/rssService';
import { FeedConfig } from './types';
import { Article } from '@prisma/client';

const SAMPLE_FEEDS: FeedConfig[] = [
  { url: 'https://news.ycombinator.com/rss', title: 'Hacker News' },
  { url: 'https://www.techmeme.com/feed.xml', title: 'Techmeme' },
  { url: 'https://techcrunch.com/feed/', title: 'TechCrunch' }
];

// ========================================
// CLUSTERING CONFIGURATION
// ========================================

// Choose vectorization method:
// - 'tfidf': Fast, lightweight, based on word frequency (original)
// - 'semantic': Slower, but understands meaning better (recommended)
const VECTORIZATION_METHOD: 'tfidf' | 'semantic' = 'semantic';

// Auto-tune clustering: dynamically find the best strategy and parameters
const AUTO_TUNE_CLUSTERING = true;

async function main() {
  const db = new DatabaseService();

  try {
    console.log('Seeding feeds...');
    await db.seedFeeds(SAMPLE_FEEDS);

    console.log('Fetching and updating articles...');
    const feeds = await db.getFeeds();

    for (const feed of feeds) {
      const content = await fetchFeed(feed.url);
      const articles = await parseFeedContent(content);
      for (const article of articles) {
        await db.saveArticle(article, feed.id);
      }
    }

    console.log('Processing and clustering articles...');
    const articles: Article[] = await db.getAllArticles();

    if (articles.length === 0) {
      console.log('No articles found to cluster.');
      return;
    }

    // Vectorize articles based on chosen method
    console.log(`Using ${VECTORIZATION_METHOD} vectorization...`);
    let vectors: number[][];

    if (VECTORIZATION_METHOD === 'semantic') {
      const semanticProcessor = new SemanticVectorize();
      const vectorizedArticles = await semanticProcessor.vectorizeArticles(articles);
      vectors = vectorizedArticles.map(article => article.vector);
    } else {
      const tfidfProcessor = new Vectorize();
      const vectorizedArticles = tfidfProcessor.vectorizeArticles(articles);
      vectors = vectorizedArticles.map(article => article.vector);
    }

    console.log(`Vector dimensions: ${vectors[0].length}`);

    // Auto-tune clustering to find the best strategy and parameters
    let clusterLabels: number[];

    if (AUTO_TUNE_CLUSTERING) {
      console.log('\nAuto-tuning clustering strategies...');

      const tuner = new GridSearchTuner({
        verbose: true,
        scoringWeights: {
          silhouette: 0.7,      // Prioritize cluster quality
          daviesBouldin: 0.2,   // Some weight on compactness
          numClusters: 0.1      // Slight preference for moderate cluster count
        }
      });

      // Define strategies to test
      const strategies: Array<{ strategy: any; paramGrid: { [key: string]: any[] } }> = [
        {
          strategy: new KMeansStrategy(),
          paramGrid: {
            k: [3, 5, 7, 10],
            maxIterations: [100],
            seed: [42]
          }
        },
        {
          strategy: new HierarchicalStrategy(),
          paramGrid: {
            numClusters: [3, 5, 7, 10, 15],
            linkage: ['average', 'complete']
          }
        },
        {
          strategy: new AdaptiveDBSCANStrategy(),
          paramGrid: {
            epsilon: [0.5, 0.55, 0.6, 0.65, 0.7],
            minPts: [2, 3, 4]
          }
        }
      ];

      const bestResult = tuner.compareStrategies(strategies, vectors);
      clusterLabels = bestResult.labels;

      console.log('\n========================================');
      console.log('BEST CLUSTERING CONFIGURATION');
      console.log('========================================');
      console.log(`Strategy: ${bestResult.strategy}`);
      console.log(`Parameters: ${JSON.stringify(bestResult.params)}`);
      console.log(`Silhouette Score: ${bestResult.metrics.silhouetteScore.toFixed(4)}`);
      console.log(`Davies-Bouldin Index: ${bestResult.metrics.daviesBouldinIndex.toFixed(4)}`);
      console.log(`Number of Clusters: ${bestResult.metrics.numClusters}`);
      console.log(`Number of Noise Points: ${bestResult.metrics.numNoise}`);
      console.log(`Cluster Sizes: [${bestResult.metrics.clusterSizes.join(', ')}]`);
      console.log('========================================\n');
    } else {
      // Fallback to default strategy (not recommended)
      const strategy = new HierarchicalStrategy();
      clusterLabels = strategy.cluster(vectors, { numClusters: 5, linkage: 'average' });
    }

    const clusterNames: Record<string, string> = labelClusters(articles, clusterLabels);

    // Create or update clusters with their labels
    for (const [clusterId, clusterName] of Object.entries(clusterNames)) {
      const articlesInCluster = articles.filter((_, i) => clusterLabels[i] === parseInt(clusterId));
      const articleIds = articlesInCluster.map(a => a.id);

      // Create a new cluster with the label as keywords
      const cluster = await db.createCluster([clusterName]);
      await db.assignArticlesToCluster(articleIds, cluster.id);
    }
    
    const clusters = await db.getClustersWithArticles();
    console.log('Results:',clusters.length);
    clusters.forEach((cluster, i) => {
      console.log(`\nCluster ${i + 1}: ${JSON.parse(cluster.keywords)[0]}`);
      console.log('Articles:');
      cluster.articles.forEach(article => {
        console.log(`- ${article.title} (from ${article.feed.title})`);
      });
    });
  } catch (error) {
    console.error('Application error:', error);
  } finally {
    await db.disconnect();
  }
}

main().catch(console.error);