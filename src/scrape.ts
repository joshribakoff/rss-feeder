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
import { Prisma } from '@prisma/client';

type ArticleWithFeed = Prisma.ArticleGetPayload<{
  include: { feed: true }
}>;

const SAMPLE_FEEDS: FeedConfig[] = [
  // Technology & News
  { url: 'https://news.ycombinator.com/rss', title: 'Hacker News' },
  { url: 'https://www.techmeme.com/feed.xml', title: 'Techmeme' },
  { url: 'https://techcrunch.com/feed/', title: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', title: 'The Verge' },
  { url: 'https://arstechnica.com/feed/', title: 'Ars Technica' },

  // General News
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', title: 'BBC News' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', title: 'New York Times' },
  { url: 'https://www.theguardian.com/world/rss', title: 'The Guardian World' },
  { url: 'https://www.reuters.com/rssFeed/topNews', title: 'Reuters Top News' },
  { url: 'https://feeds.npr.org/1001/rss.xml', title: 'NPR News' },

  // Economics & Finance
  { url: 'https://www.economist.com/finance-and-economics/rss.xml', title: 'The Economist - Finance' },
  { url: 'https://www.ft.com/?format=rss', title: 'Financial Times' },
  { url: 'https://www.wsj.com/xml/rss/3_7085.xml', title: 'Wall Street Journal - Markets' },
  { url: 'https://www.bloomberg.com/feed/podcast/etf-report.xml', title: 'Bloomberg Markets' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', title: 'MarketWatch' },

  // Science & Research
  { url: 'https://www.science.org/rss/news_current.xml', title: 'Science Magazine' },
  { url: 'https://www.nature.com/nature.rss', title: 'Nature' },
  { url: 'https://www.scientificamerican.com/feed/', title: 'Scientific American' },
  { url: 'https://phys.org/rss-feed/', title: 'Phys.org' },
  { url: 'https://www.sciencedaily.com/rss/all.xml', title: 'ScienceDaily' },
  { url: 'https://www.newscientist.com/feed/home', title: 'New Scientist' },

  // Mathematics & Computer Science
  { url: 'https://terrytao.wordpress.com/feed/', title: 'Terry Tao - Math' },
  { url: 'https://www.quantamagazine.org/feed/', title: 'Quanta Magazine' },
  { url: 'https://mathoverflow.net/feeds', title: 'MathOverflow' },
  { url: 'https://arxiv.org/rss/math.GT', title: 'arXiv - Geometry & Topology' },

  // Sports
  { url: 'https://www.espn.com/espn/rss/news', title: 'ESPN News' },
  { url: 'https://www.skysports.com/rss/12040', title: 'Sky Sports' },
  { url: 'https://www.si.com/rss/si_topstories.rss', title: 'Sports Illustrated' },
  { url: 'https://www.cbssports.com/rss/headlines/', title: 'CBS Sports' },

  // Surfing & Water Sports
  { url: 'https://www.surfline.com/rss/surf-news', title: 'Surfline News' },
  { url: 'https://stabmag.com/feed/', title: 'Stab Magazine - Surfing' },
  { url: 'https://www.theinertia.com/feed/', title: 'The Inertia - Surf & Outdoors' },
  { url: 'https://www.surfer.com/feed/', title: 'Surfer Magazine' },

  // Swimming & Aquatics
  { url: 'https://www.swimmingworldmagazine.com/news/feed/', title: 'Swimming World Magazine' },
  { url: 'https://www.usaswimming.org/rss', title: 'USA Swimming' },

  // Miscellaneous Interests
  { url: 'https://www.atlasobscura.com/feeds/latest', title: 'Atlas Obscura' },
  { url: 'https://longform.org/feed.rss', title: 'Longform' },
  { url: 'https://www.reddit.com/r/science/.rss', title: 'Reddit - Science' }
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
      try {
        console.log(`Fetching feed: ${feed.title} (${feed.url})`);
      const content = await fetchFeed(feed.url);
      const articles = await parseFeedContent(content);
        console.log(`Found ${articles.length} articles from ${feed.title}`);
      for (const article of articles) {
        await db.saveArticle(article, feed.id);
        }
      } catch (error) {
        console.error(`Failed to fetch feed ${feed.title} (${feed.url}):`, error instanceof Error ? error.message : error);
        // Continue processing other feeds
      }
    }

    console.log('Processing and clustering articles...');
    const articles: ArticleWithFeed[] = await db.getAllArticles();

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