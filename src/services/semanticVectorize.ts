import { pipeline } from '@xenova/transformers';
import { Article } from '@prisma/client';
import { ArticleLike } from '../types';

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

  async vectorizeArticles(articles: Array<Article | ArticleLike>): Promise<VectorizedArticle[]> {
    await this.initialize();

    const results: VectorizedArticle[] = [];

    for (const article of articles) {
      // Combine title and content for embedding
      const text = `${article.title} ${article.content || ''}`.trim();

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
