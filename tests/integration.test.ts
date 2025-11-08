import { describe, it, expect } from 'vitest';
import { ClusteringService } from '../src/services/clusteringService';
import { mixedArticles, techOnlyArticles } from './mocks';

describe('Article Clustering', () => {
  
  it('should cluster similar articles together', async () => {
      const clusteringService = new ClusteringService();
      const articles = mixedArticles;

      const clusters = await clusteringService.clusterArticles(articles);
      
      expect(clusters).toEqual(['tech', 'sports', 'politics']);
    });

  it('should handle single-topic articles', async () => {
    const clusteringService = new ClusteringService();
    const articles = techOnlyArticles;

    const clusters = await clusteringService.clusterArticles(articles);
    
    expect(clusters).toEqual(['tech']);
  });

  it('should handle empty input', async () => {
    const clusteringService = new ClusteringService();
    const clusters = await clusteringService.clusterArticles([]);
    expect(clusters).toHaveLength(0);
  });
});