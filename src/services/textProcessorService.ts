import natural from 'natural';
import { Article } from '@prisma/client';
import { VectorizedArticle } from '../types';

const TfIdf = natural.TfIdf;

export class TextProcessor {
  private tfidf: typeof natural.TfIdf;
  private terms: Set<string>;
  private termsList: string[];

  constructor() {
    this.tfidf = new TfIdf();
    this.terms = new Set<string>();
    this.termsList = [];
  }

  private addDocuments(articles: Article[]) {
    articles.forEach(article => {
      this.tfidf.addDocument(`${article.title} ${article.content}`);
    });
  }

  private collectTerms() {
    // Get all unique terms across documents
    this.terms = new Set<string>();
    for (let i = 0; i < this.tfidf.documents.length; i++) {
      this.tfidf.listTerms(i).forEach(item => this.terms.add(item.term));
    }
    this.termsList = Array.from(this.terms);
  }

  public vectorizeArticles(articles: Article[]): VectorizedArticle[] {
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