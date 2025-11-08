import Parser from 'rss-parser';
import { PrismaClient } from '@prisma/client';
import { FeedConfig } from '../types';

const parser = new Parser();
const MAX_ARTICLES_PER_FEED = 10;

export async function parseFeed(url: string) {
  try {
    const parsedFeed = await parser.parseURL(url);
    return parsedFeed.items.slice(0, MAX_ARTICLES_PER_FEED).map(item => ({
      title: item.title || '',
      content: item.contentSnippet || item.content || '',
      link: item.link || ''
    }));
  } catch (error) {
    console.error(`Error fetching feed ${url}:`, error);
    return [];
  }
}