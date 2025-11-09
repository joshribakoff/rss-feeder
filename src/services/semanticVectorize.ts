import { pipeline } from '@xenova/transformers';
import { Prisma } from '@prisma/client';
import { ArticleLike } from '../types';

type ArticleWithFeed = Prisma.ArticleGetPayload<{
  include: { feed: true }
}>;

export interface VectorizedArticle {
  id: number;
  vector: number[];
}

/**
 * Semantic vectorization using Sentence Transformers (embeddings)
 * This is much better than TF-IDF for understanding semantic similarity
 */
export class SemanticVectorize {
  private embedder: any = null;

  async initialize() {
    if (!this.embedder) {
      console.log('Loading sentence transformer model...');
      // Using a lightweight model that runs in Node.js
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('Model loaded successfully');
    }
  }

  async vectorizeArticles(articles: Array<ArticleWithFeed | ArticleLike>): Promise<VectorizedArticle[]> {
    await this.initialize();

    const results: VectorizedArticle[] = [];

    for (const article of articles) {
      // Combine feed name, title and content for embedding (same input as TF-IDF)
      const feedName = article.feed?.title || '';
      const text = `${feedName} ${article.title} ${article.content || ''}`.trim();

      // Get embedding
      const output = await this.embedder(text, { pooling: 'mean', normalize: true });

      // Convert to regular array
      const vector = Array.from(output.data) as number[];

      results.push({
        id: article.id,
        vector
      });
    }

    return results;
  }
}
