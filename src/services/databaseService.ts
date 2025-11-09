import { PrismaClient } from '@prisma/client';
import { FeedConfig } from '../types';

const prisma = new PrismaClient();

export class DatabaseService {
  async seedFeeds(feeds: FeedConfig[]) {
    for (const feed of feeds) {
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

  async getFeeds() {
    return prisma.feed.findMany();
  }

  async saveArticle(article: { title: string; content: string; link: string }, feedId: number) {
    return prisma.article.upsert({
      where: { link: article.link },
      update: {},
      create: {
        ...article,
        feedId
      }
    });
  }

  async getAllArticles() {
    return prisma.article.findMany();
  }

  async createCluster(keywords: string[]) {
    const keywordsString = JSON.stringify(keywords);
    return prisma.cluster.upsert({
      where: { keywords: keywordsString },
      update: {},
      create: {
        keywords: keywordsString
      }
    });
  }

  async assignArticlesToCluster(articleIds: number[], clusterId: number) {
    return prisma.article.updateMany({
      where: { id: { in: articleIds } },
      data: { clusterId }
    });
  }

  async getClustersWithArticles() {
    return prisma.cluster.findMany({
      // where has articles
      where: {
        articles: {
          some: {}
        }
      },
      include: {
        articles: {
          include: {feed: true}
        },
      },
    });
  }

  async disconnect() {
    await prisma.$disconnect();
  }
}