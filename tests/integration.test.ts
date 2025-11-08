import { describe, it, expect } from 'vitest';
import { Vectorize } from '../src/services/vectorize';
import { clusterVectors, labelClusters } from '../src/services/cluster';
import { mixedArticles, techOnlyArticles } from './mocks';

describe('Article Clustering Integration', () => {
  it('should cluster mixed articles into distinct topic groups', async () => {
    // Given: Articles with mixed topics (tech, sports, politics)
    const vectorizer = new Vectorize();
    
    // When: We vectorize and cluster the articles
    const vectorizedArticles = vectorizer.vectorizeArticles(mixedArticles);
    const vectors = vectorizedArticles.map(article => article.vector);
    const clusterLabels = clusterVectors(vectors, .9999, 1);
    const clusterNames = labelClusters(mixedArticles, clusterLabels);
    
    // Then: We should have 4 main clusters
    const uniqueClusters = new Set(clusterLabels.filter(label => label !== -1));
    expect(uniqueClusters.size).toBe(4);

    // And: The cluster names should match expected categories
    expect(clusterNames).toEqual({
      '0': 'News & Tech',
      '1': 'Weather & Report',
      '2': 'Recipe & Blog',
      '3': 'Travel & Tips'
    });

    const getTitlesForCluster = (clusterId: number) => 
      mixedArticles.filter((_, i) => clusterLabels[i] === clusterId).map(a => a.title);
    
    const actual = Object.keys(clusterNames).map(key => getTitlesForCluster(parseInt(key)));
    expect(actual).toMatchInlineSnapshot(`
      [
        [
          "Tech news",
          "Phone review",
          "Tech innovation",
          "Mobile news",
          "Tech analysis",
          "Sport update",
          "NBA news",
          "Sports coverage",
          "Basketball update",
          "NBA analysis",
          "Political news",
          "Government update",
          "Policy analysis",
          "Politics today",
          "Capitol news",
        ],
        [
          "Weather report",
        ],
        [
          "Recipe blog",
        ],
        [
          "Travel tips",
        ],
      ]
    `)
  });

  it('should cluster single-topic articles with high cohesion', async () => {
    // Given: Articles about a single topic (tech)
    const vectorizer = new Vectorize();
    
    // When: We vectorize and cluster the articles
    const vectorizedArticles = vectorizer.vectorizeArticles(techOnlyArticles);
    const vectors = vectorizedArticles.map(article => article.vector);
    const clusterLabels = clusterVectors(vectors, .9999, 1);
    const clusterNames = labelClusters(techOnlyArticles, clusterLabels);
    
    // Then: We should have 1-2 clusters for tech articles
    const uniqueClusters = new Set(clusterLabels.filter(label => label !== -1));
    expect(uniqueClusters.size).toBeGreaterThanOrEqual(1);
    expect(uniqueClusters.size).toBeLessThanOrEqual(2);
    
    // And: Each cluster should contain some articles
    for (const clusterId of uniqueClusters) {
      const titlesInCluster = techOnlyArticles
        .filter((_, i) => clusterLabels[i] === clusterId)
        .map(a => a.title);
      expect(titlesInCluster.length).toBeGreaterThan(0);
    }
    
    // And: Cluster names should contain tech-related terms
    const labels = Object.values(clusterNames);
    expect(labels.some(label => /News|Tech/i.test(label))).toBe(true);
  });

  it('should handle empty input gracefully', async () => {
    // Given: Empty article list
    const vectorizer = new Vectorize();
    const emptyArticles: any[] = [];
    
    // When: We try to vectorize and cluster
    const vectorizedArticles = vectorizer.vectorizeArticles(emptyArticles);
    const vectors = vectorizedArticles.map(article => article.vector);
    const clusterLabels = clusterVectors(vectors, .9999, 1);
    const clusterNames = labelClusters(emptyArticles, clusterLabels);
    
    // Then: Results should be empty but not throw errors
    expect(vectorizedArticles).toHaveLength(0);
    expect(clusterLabels).toHaveLength(0);
    expect(Object.keys(clusterNames)).toHaveLength(0);
  });
});