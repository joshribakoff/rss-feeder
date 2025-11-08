import { describe, it, expect } from 'vitest';
import { Vectorize } from '../src/services/vectorize';
import { mixedArticles, techOnlyArticles } from './mocks';

type ArticleLike = { id: number; title: string; content: string };

describe('TextProcessor.vectorizeArticles', () => {
  it('produces deterministic TF-IDF vectors (snapshots) and correct shape for mocks', () => {
    const tp = new Vectorize();

    const vecs = tp.vectorizeArticles(techOnlyArticles as ArticleLike[]);

    // shape checks
    expect(vecs).toHaveLength(techOnlyArticles.length);
    const terms = tp.getTerms();
    vecs.forEach(v => expect(v.vector).toHaveLength(terms.length));

    // ensure there is at least one non-zero entry in each vector
    vecs.forEach(v => expect(v.vector.some(x => x > 0)).toBe(true));

    // Snapshot the numeric vectors so Vitest will write the expected output.
    // This makes the test act as a regression guard for vectorization.
    expect(vecs.map(v => v.vector)).toMatchSnapshot();
  });

  it('has unique-word nonzero entries only in the document that contains them', () => {
    const tp = new Vectorize();
    const articles = mixedArticles as ArticleLike[];
    const vecs = tp.vectorizeArticles(articles);
    const terms = tp.getTerms();

    // Count in how many documents each term appears (non-zero)
    const docCounts = new Array(terms.length).fill(0);
    vecs.forEach(v => {
      v.vector.forEach((val, i) => {
        if (val > 0) docCounts[i]++;
      });
    });

    // There should be at least one term that appears in exactly 1 document
    const uniqueTermIndex = docCounts.findIndex(c => c === 1);
    expect(uniqueTermIndex).toBeGreaterThanOrEqual(0);

    // Verify that for that term, only one vector has a non-zero entry
    const nonZeroDocs = vecs.filter(v => v.vector[uniqueTermIndex] > 0);
    expect(nonZeroDocs).toHaveLength(1);
  });

  it('gives larger weight to repeated words within a document (controlled example)', () => {
    const tp = new Vectorize();

    const articles: ArticleLike[] = [
      { id: 1, title: 'dog dog dog', content: 'dog dog' },
      { id: 2, title: 'dog', content: 'dog' },
      { id: 3, title: 'cat', content: 'cat' },
    ];

    const vecs = tp.vectorizeArticles(articles);
    const terms = tp.getTerms();

    const dogIndex = terms.findIndex(t => t === 'dog');
    const catIndex = terms.findIndex(t => t === 'cat');

    // Ensure the term indices exist
    expect(dogIndex).toBeGreaterThanOrEqual(0);
    expect(catIndex).toBeGreaterThanOrEqual(0);

    // Weight of 'dog' in article 1 (many repetitions) should be greater than in article 2
    const w1 = vecs[0].vector[dogIndex];
    const w2 = vecs[1].vector[dogIndex];
    expect(w1).toBeGreaterThan(w2);

    // 'cat' should only appear in article 3
    expect(vecs[2].vector[catIndex]).toBeGreaterThan(0);
    expect(vecs[0].vector[catIndex]).toBe(0);
    expect(vecs[1].vector[catIndex]).toBe(0);
  });
});
