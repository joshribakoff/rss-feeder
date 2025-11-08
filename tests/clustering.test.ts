import { describe, it, expect } from 'vitest';
import { ClusteringService } from '../src/services/clusteringService';

describe('Article Clustering', () => {
  
  it('should cluster similar articles together', async () => {
      const clusteringService = new ClusteringService();
      const articles = [
      {
        id: 1,
        title: 'Tech news',
        content: 'Apple launches new iPhone with AI features',
      },
      {
        id: 2,
        title: 'Phone review',
        content: 'New iPhone review: Great AI capabilities',
      },
      {
        id: 3,
        title: 'Sport update',
        content: 'Lakers win basketball championship',
      },
      {
        id: 4,
        title: 'NBA news',
        content: 'Basketball season finals concluded',
      }
    ];

    const clusters = await clusteringService.clusterArticles(articles);
    
    expect(clusters).toBe(['tech', 'sports'])
  });

  it('should handle single-topic articles', async () => {
    const clusteringService = new ClusteringService();
    const articles = [
      {
        id: 1,
        title: 'Tech news 1',
        content: 'Apple new product announcement',
      },
      {
        id: 2,
        title: 'Tech news 2',
        content: 'Apple stock price rises',
      },
      {
        id: 3,
        title: 'Tech news 3',
        content: 'Apple developer conference',
      }
    ];

    const clusters = await clusteringService.clusterArticles(articles);
    
    expect(clusters).toBe(['tech', 'sports'])
  });

  it('should handle empty input', async () => {
    const clusteringService = new ClusteringService();
    const clusters = await clusteringService.clusterArticles([]);
    expect(clusters).toHaveLength(0);
  });
});