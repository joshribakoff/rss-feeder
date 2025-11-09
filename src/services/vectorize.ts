import * as natural from 'natural';
import { Prisma } from '@prisma/client';
import { ArticleLike } from '../types';

type ArticleWithFeed = Prisma.ArticleGetPayload<{
  include: { feed: true }
}>;

export interface VectorizedArticle {
  id: number;
  vector: number[];
}

const TfIdf = natural.TfIdf;

export class Vectorize {
  private tfidf: natural.TfIdf;
  private terms: Set<string>;
  private termsList: string[];

  constructor() {
    this.tfidf = new TfIdf();
    this.terms = new Set<string>();
    this.termsList = [];
  }

  private addDocuments(articles: Array<ArticleWithFeed | ArticleLike>) {
    articles.forEach(article => {
      // Extract domain and path from URL for additional features
      const urlTokens = article.link ? this.extractUrlTokens(article.link) : '';
      const feedName = article.feed?.title || '';
      const inputText = `${feedName} ${article.title} ${article.content} ${urlTokens}`;
      this.tfidf.addDocument(inputText);
    });
  }

  private extractUrlTokens(url: string): string {
    try {
      const urlObj = new URL(url);
      // Extract root domain (e.g., "www.github.com" -> "github")
      const hostParts = urlObj.hostname.split('.');
      // Get the main domain name (second-to-last part for most domains)
      const rootDomain = hostParts.length >= 2
        ? hostParts[hostParts.length - 2]
        : hostParts[0];
      return rootDomain;
    } catch {
      return '';
    }
  }

  private collectTerms() {
    // Get all unique terms across documents
    this.terms = new Set<string>();
    if (this.tfidf.documents && Array.isArray(this.tfidf.documents)) {
      for (let i = 0; i < this.tfidf.documents.length; i++) {
        this.tfidf.listTerms(i).forEach(item => this.terms.add(item.term));
      }
    }
    this.termsList = Array.from(this.terms);
  }

  public vectorizeArticles(articles: Array<ArticleWithFeed | ArticleLike>): VectorizedArticle[] {
    this.addDocuments(articles);
    this.collectTerms();

    return articles.map((article, i) => {
      const vector = new Array(this.termsList.length).fill(0);
      const docTerms = this.tfidf.listTerms(i);
      docTerms.forEach(item => {
        const termIndex = this.termsList.indexOf(item.term);
        vector[termIndex] = item.tfidf;
      });
      return {
        id: article.id,
        vector
      };
    });
  }

  public getTerms(): string[] {
    return this.termsList;
  }
}