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
    const items = parsedFeed.items.slice(0, MAX_ARTICLES_PER_FEED).map(item => ({
      title: item.title || '',
      content: item.contentSnippet || item.content || '',
      link: item.link || ''
    }));

    // Check if all items have the same content (e.g., all "Comments")
    const contents = items.map(item => item.content).filter(c => c);
    const allSameContent = contents.length > 1 && contents.every(c => c === contents[0]);

    // Filter out unhelpful content
    return items.map(item => {
      const wordCount = item.content.trim().split(/\s+/).filter(word => word.length > 0).length;
      const isUseful = wordCount >= 3 && !allSameContent;

      return {
        ...item,
        content: isUseful ? item.content : ''
      };
    });
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