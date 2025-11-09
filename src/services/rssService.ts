import Parser from 'rss-parser';
import { FeedConfig } from '../types';
import axios from 'axios';

const parser = new Parser();
const MAX_ARTICLES_PER_FEED = 10;

export async function fetchFeed(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching feed ${url}:`, error);
    throw error;
  }
}

export async function parseFeedContent(content: string) {
  try {
    const parsedFeed = await parser.parseString(content);
    return parsedFeed.items.slice(0, MAX_ARTICLES_PER_FEED).map(item => ({
      title: item.title || '',
      content: item.contentSnippet || item.content || '',
      link: item.link || ''
    }));
  } catch (error) {
    console.error(`Error parsing feed content:`, error);
    return [];
  }
}

// Convenience method that combines fetch and parse
export async function fetchAndParseFeed(url: string) {
  try {
    const content = await fetchFeed(url);
    return parseFeedContent(content);
  } catch (error) {
    console.error(`Error processing feed ${url}:`, error);
    return [];
  }
}