import { describe, it, expect } from 'vitest';
import { ClusteringService } from '../src/services/clusteringService';

describe('Article Clustering', () => {
  
  it('should cluster similar articles together', async () => {
      const clusteringService = new ClusteringService();
      const articles = [
        // Tech cluster
        {
          id: 1,
          title: 'Tech news',
          content: 'Apple launches new iPhone with AI features and improved camera system',
        },
        {
          id: 2,
          title: 'Phone review',
          content: 'New iPhone review: Great AI capabilities and innovative design choices',
        },
        {
          id: 3,
          title: 'Tech innovation',
          content: 'Apple introduces revolutionary AI features in latest software update',
        },
        {
          id: 4,
          title: 'Mobile news',
          content: 'iPhone sales surge as new AI features attract customers worldwide',
        },
        {
          id: 5,
          title: 'Tech analysis',
          content: 'How Apple is leading the AI revolution in mobile devices',
        },
        // Sports cluster
        {
          id: 6,
          title: 'Sport update',
          content: 'Lakers win basketball championship in thrilling final game',
        },
        {
          id: 7,
          title: 'NBA news',
          content: 'Basketball season finals concluded with record-breaking performance',
        },
        {
          id: 8,
          title: 'Sports coverage',
          content: 'NBA playoffs reach climax as teams battle for championship',
        },
        {
          id: 9,
          title: 'Basketball update',
          content: 'Lakers dominate fourth quarter to secure crucial playoff victory',
        },
        {
          id: 10,
          title: 'NBA analysis',
          content: 'Championship series showcases evolution of modern basketball',
        },
        // Politics cluster
        {
          id: 11,
          title: 'Political news',
          content: 'Senate passes new infrastructure bill with bipartisan support',
        },
        {
          id: 12,
          title: 'Government update',
          content: 'Infrastructure legislation moves forward with key amendments',
        },
        {
          id: 13,
          title: 'Policy analysis',
          content: 'Breaking down the implications of new infrastructure bill',
        },
        {
          id: 14,
          title: 'Politics today',
          content: 'Lawmakers debate infrastructure spending and economic impact',
        },
        {
          id: 15,
          title: 'Capitol news',
          content: 'Infrastructure bill signing ceremony scheduled for next week',
        },
        // Noise points (mixed topics)
        {
          id: 16,
          title: 'Weather report',
          content: 'Sunny conditions expected for the weekend',
        },
        {
          id: 17,
          title: 'Recipe blog',
          content: 'Easy chocolate cake recipe for beginners',
        },
        {
          id: 18,
          title: 'Travel tips',
          content: 'Best destinations for summer vacation',
        }
      ];

      const clusters = await clusteringService.clusterArticles(articles);
      
      expect(clusters).toEqual(['tech', 'sports', 'politics']);
    });

  it('should handle single-topic articles', async () => {
    const clusteringService = new ClusteringService();
    const articles = [
      {
        id: 1,
        title: 'Tech news 1',
        content: 'Apple announces groundbreaking advances in artificial intelligence',
      },
      {
        id: 2,
        title: 'Tech news 2',
        content: 'Apple stock price rises as AI innovations drive market confidence',
      },
      {
        id: 3,
        title: 'Tech news 3',
        content: 'Apple developer conference showcases new AI capabilities',
      },
      {
        id: 4,
        title: 'Silicon Valley update',
        content: 'Apple leads tech industry with innovative AI implementations',
      },
      {
        id: 5,
        title: 'Technology report',
        content: 'Apple demonstrates powerful AI features at annual conference',
      },
      {
        id: 6,
        title: 'Tech analysis',
        content: 'Breaking down Apple\'s latest AI advancements and future roadmap',
      },
      {
        id: 7,
        title: 'Industry news',
        content: 'Tech sector responds to Apple\'s revolutionary AI announcements',
      },
      {
        id: 8,
        title: 'Market watch',
        content: 'Apple\'s AI innovations reshape technology landscape',
      }
    ];

    const clusters = await clusteringService.clusterArticles(articles);
    
    expect(clusters).toEqual(['tech']);
  });

  it('should handle empty input', async () => {
    const clusteringService = new ClusteringService();
    const clusters = await clusteringService.clusterArticles([]);
    expect(clusters).toHaveLength(0);
  });
});