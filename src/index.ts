import { DatabaseService } from './services/databaseService';
import { Vectorize } from './services/vectorize';
import { clusterVectors, labelClusters } from './services/cluster';
import { parseFeed } from './services/rssService';
import { FeedConfig } from './types';
import { Article } from '@prisma/client';

const SAMPLE_FEEDS: FeedConfig[] = [
  { url: 'https://news.ycombinator.com/rss', title: 'Hacker News' },
  { url: 'https://www.techmeme.com/feed.xml', title: 'Techmeme' },
  { url: 'https://techcrunch.com/feed/', title: 'TechCrunch' }
];

// Configuration for clustering
const SIMILARITY_THRESHOLD = 0.9;
const MIN_CLUSTER_SIZE = 1;

async function main() {
  const db = new DatabaseService();
  const textProcessor = new Vectorize();

  try {
    console.log('Seeding feeds...');
    await db.seedFeeds(SAMPLE_FEEDS);
    
    console.log('Fetching and updating articles...');
    const feeds = await db.getFeeds();
    
    for (const feed of feeds) {
      const articles = await parseFeed(feed.url);
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

    const vectorizedArticles = textProcessor.vectorizeArticles(articles);
    const vectors: number[][] = vectorizedArticles.map(article => article.vector);
    
    // Perform clustering using the parameters from tests
    const clusterLabels: number[] = clusterVectors(vectors, SIMILARITY_THRESHOLD, MIN_CLUSTER_SIZE);
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