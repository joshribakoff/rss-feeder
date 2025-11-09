import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function exportDatabaseToMocks() {
  try {
    console.log('Exporting articles from database...');

    const articles = await prisma.article.findMany({
      include: {
        feed: {
          select: {
            title: true,
            url: true
          }
        }
      }
    });

    console.log(`Found ${articles.length} articles`);

    // Serialize to a format suitable for mock data
    const mockData = {
      articles: articles.map(article => ({
        id: article.id,
        title: article.title,
        content: article.content,
        link: article.link,
        feedId: article.feedId,
        feedTitle: article.feed.title,
        feedUrl: article.feed.url,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString()
      })),
      exportedAt: new Date().toISOString(),
      totalArticles: articles.length
    };

    // Write to file
    const outputPath = join(__dirname, '../tests/mocks/real-articles.json');
    writeFileSync(outputPath, JSON.stringify(mockData, null, 2));

    console.log(`Exported ${articles.length} articles to ${outputPath}`);

    // Also create a simplified mock array format similar to existing mocks
    const simplifiedMocks = articles.map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      link: article.link,
      feedId: article.feedId,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt
    }));

    const simplifiedPath = join(__dirname, '../tests/mocks/real-articles-simple.ts');
    const tsContent = `import { type Article } from '@prisma/client';

// Exported from database on ${new Date().toISOString()}
// Total articles: ${articles.length}
export const realArticles: Partial<Article>[] = ${JSON.stringify(simplifiedMocks, null, 2)};
`;

    writeFileSync(simplifiedPath, tsContent);
    console.log(`Exported simplified mocks to ${simplifiedPath}`);

  } catch (error) {
    console.error('Error exporting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabaseToMocks().catch(console.error);
