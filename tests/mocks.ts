import { type Article } from '@prisma/client';
import { ArticleLike } from '../src/types';

// Mock articles with partial Prisma schema (only fields needed for tests)
export const mixedArticles: ArticleLike[] = [
  // Tech cluster
  {
    id: 1,
    title: 'Tech news',
    content: 'Apple launches new iPhone with AI features and improved camera system',
    feed: { title: 'TechCrunch' }
  },
  {
    id: 2,
    title: 'Phone review',
    content: 'New iPhone review: Great AI capabilities and innovative design choices',
    feed: { title: 'TechCrunch' }
  },
  {
    id: 3,
    title: 'Tech innovation',
    content: 'Apple introduces revolutionary AI features in latest software update',
    feed: { title: 'TechCrunch' }
  },
  {
    id: 4,
    title: 'Mobile news',
    content: 'iPhone sales surge as new AI features attract customers worldwide',
    feed: { title: 'TechCrunch' }
  },
  {
    id: 5,
    title: 'Tech analysis',
    content: 'How Apple is leading the AI revolution in mobile devices',
    feed: { title: 'TechCrunch' }
  },
  // Sports cluster
  {
    id: 6,
    title: 'Sport update',
    content: 'Lakers win basketball championship in thrilling final game',
    feed: { title: 'ESPN' }
  },
  {
    id: 7,
    title: 'NBA news',
    content: 'Basketball season finals concluded with record-breaking performance',
    feed: { title: 'ESPN' }
  },
  {
    id: 8,
    title: 'Sports coverage',
    content: 'NBA playoffs reach climax as teams battle for championship',
    feed: { title: 'ESPN' }
  },
  {
    id: 9,
    title: 'Basketball update',
    content: 'Lakers dominate fourth quarter to secure crucial playoff victory',
    feed: { title: 'ESPN' }
  },
  {
    id: 10,
    title: 'NBA analysis',
    content: 'Championship series showcases evolution of modern basketball',
    feed: { title: 'ESPN' }
  },
  // Politics cluster
  {
    id: 11,
    title: 'Political news',
    content: 'Senate passes new infrastructure bill with bipartisan support',
    feed: { title: 'CNN Politics' }
  },
  {
    id: 12,
    title: 'Government update',
    content: 'Infrastructure legislation moves forward with key amendments',
    feed: { title: 'CNN Politics' }
  },
  {
    id: 13,
    title: 'Policy analysis',
    content: 'Breaking down the implications of new infrastructure bill',
    feed: { title: 'CNN Politics' }
  },
  {
    id: 14,
    title: 'Politics today',
    content: 'Lawmakers debate infrastructure spending and economic impact',
    feed: { title: 'CNN Politics' }
  },
  {
    id: 15,
    title: 'Capitol news',
    content: 'Infrastructure bill signing ceremony scheduled for next week',
    feed: { title: 'CNN Politics' }
  },
  // Noise points (mixed topics)
  {
    id: 16,
    title: 'Weather report',
    content: 'Sunny conditions expected for the weekend',
    feed: { title: 'Weather Channel' }
  },
  {
    id: 17,
    title: 'Recipe blog',
    content: 'Easy chocolate cake recipe for beginners',
    feed: { title: 'Food Network' }
  },
  {
    id: 18,
    title: 'Travel tips',
    content: 'Best destinations for summer vacation',
    feed: { title: 'Travel & Leisure' }
  }
];

export const techOnlyArticles: ArticleLike[] = [
  {
    id: 1,
    title: 'Tech news 1',
    content: 'Apple announces groundbreaking advances in artificial intelligence',
    feed: { title: 'TechCrunch' }
  },
  {
    id: 2,
    title: 'Tech news 2',
    content: 'Apple stock price rises as AI innovations drive market confidence',
    feed: { title: 'TechCrunch' }
  },
  {
    id: 3,
    title: 'Tech news 3',
    content: 'Apple developer conference showcases new AI capabilities',
    feed: { title: 'TechCrunch' }
  },
  {
    id: 4,
    title: 'Silicon Valley update',
    content: 'Apple leads tech industry with innovative AI implementations',
    feed: { title: 'TechCrunch' }
  },
  {
    id: 5,
    title: 'Technology report',
    content: 'Apple demonstrates powerful AI features at annual conference',
    feed: { title: 'TechCrunch' }
  },
  {
    id: 6,
    title: 'Tech analysis',
    content: "Breaking down Apple's latest AI advancements and future roadmap",
    feed: { title: 'TechCrunch' }
  },
  {
    id: 7,
    title: 'Industry news',
    content: "Tech sector responds to Apple's revolutionary AI announcements",
    feed: { title: 'TechCrunch' }
  },
  {
    id: 8,
    title: 'Market watch',
    content: "Apple's AI innovations reshape technology landscape",
    feed: { title: 'TechCrunch' }
  }
];
