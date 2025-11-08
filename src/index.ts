import { PrismaClient } from '@prisma/client';
import Parser from 'rss-parser';
import natural from 'natural';
import kmeans from 'node-kmeans';
import { promisify } from 'util';

const prisma = new PrismaClient();
const parser = new Parser();
const TfIdf = natural.TfIdf;
const kmeansCluster = promisify(kmeans.clusterize);

const SAMPLE_FEEDS = [
  { url: 'https://news.ycombinator.com/rss', title: 'Hacker News' },
  { url: 'https://www.techmeme.com/feed.xml', title: 'Techmeme' },
  { url: 'https://techcrunch.com/feed/', title: 'TechCrunch' }
];

const NUM_CLUSTERS = 3;
const MAX_ARTICLES_PER_FEED = 10;

async function seedFeeds() {
  for (const feed of SAMPLE_FEEDS) {
    await prisma.feed.upsert({
      where: { url: feed.url },
      update: {},
      create: {
        url: feed.url,
        title: feed.title
      }
    });
  }
}

async function fetchArticles() {
  const feeds = await prisma.feed.findMany();
  
  for (const feed of feeds) {
    try {
      const parsedFeed = await parser.parseURL(feed.url);
      const articles = parsedFeed.items.slice(0, MAX_ARTICLES_PER_FEED);

      for (const article of articles) {
        await prisma.article.upsert({
          where: { link: article.link || '' },
          update: {},
          create: {
            title: article.title || '',
            content: article.contentSnippet || article.content || '',
            link: article.link || '',
            feedId: feed.id
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching feed ${feed.url}:`, error);
    }
  }
}

async function computeTfIdfVectors() {
  const articles = await prisma.article.findMany();
  const tfidf = new TfIdf();

  // Add documents to TF-IDF
  articles.forEach(article => {
    tfidf.addDocument(`${article.title} ${article.content}`);
  });

  // Get all unique terms across documents
  const terms = new Set<string>();
  articles.forEach((_, i) => {
    tfidf.listTerms(i).forEach(item => terms.add(item.term));
  });

  // Create fixed-dimension vectors
  const termsList = Array.from(terms);
  return articles.map((article, i) => {
    const vector = new Array(termsList.length).fill(0);
    const docTerms = tfidf.listTerms(i);
    docTerms.forEach(item => {
      const termIndex = termsList.indexOf(item.term);
      vector[termIndex] = item.tfidf;
    });
    return {
      id: article.id,
      vector
    };
  });
}

async function clusterArticles() {
  const vectors = await computeTfIdfVectors();
  const points = vectors.map(v => v.vector);
  
  try {
    if (points.length === 0) {
      console.log('No articles to cluster');
      return;
    }

    const results = await kmeansCluster(points, {
      k: Math.min(NUM_CLUSTERS, points.length),
      debug: false
    });

    // Store single cluster in database
    const cluster = await prisma.cluster.create({
      data: {
        keywords: JSON.stringify(getTopKeywords(results.centroid))
      }
    });

    // Assign articles to cluster
    const clusterArticleIds = vectors.map(v => v.id);
    
    await prisma.article.updateMany({
      where: { id: { in: clusterArticleIds } },
      data: { clusterId: cluster.id }
    });
  } catch (error) {
    console.error('Clustering error:', error);
  }
}

function getTopKeywords(centroid: number[], topK: number = 5) {
  if (!centroid || !Array.isArray(centroid)) {
    return ['no_keywords_available'];
  }
  // This is a simplified version - in practice, you'd want to map back
  // to actual terms using the TF-IDF vocabulary
  return centroid
    .map((value, index) => ({ index, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topK)
    .map(item => `keyword_${item.index}`);
}

async function displayClusters() {
  const clusters = await prisma.cluster.findMany({
    include: {
      articles: {
        select: {
          title: true,
          feed: {
            select: { title: true }
          }
        }
      }
    }
  });

  clusters.forEach((cluster, i) => {
    console.log(`\nCluster ${i + 1}:`);
    console.log('Keywords:', JSON.parse(cluster.keywords));
    console.log('Articles:');
    cluster.articles.forEach(article => {
      console.log(`- ${article.title} (from ${article.feed.title})`);
    });
  });
}

async function main() {
  console.log('Seeding feeds...');
  await seedFeeds();
  
  console.log('Fetching articles...');
  await fetchArticles();
  
  console.log('Clustering articles...');
  await clusterArticles();
  
  console.log('Results:');
  await displayClusters();
  
  await prisma.$disconnect();
}

main().catch(console.error);