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
    const clusterLabels = clusterVectors(vectors, 0.5, 2);
    const clusterNames = labelClusters(mixedArticles, clusterLabels);
    
    // Then: We should have 3 main clusters (tech, sports, politics)
    const uniqueClusters = new Set(clusterLabels.filter(label => label !== -1));
    expect(uniqueClusters.size).toBe(3);
    
    // And: Articles about the same topic should be in the same cluster
    const getTitlesForCluster = (clusterId: number) => 
      mixedArticles.filter((_, i) => clusterLabels[i] === clusterId).map(a => a.title);
    
    // Check tech articles cluster
    const techCluster = getTitlesForCluster(0);
    expect(techCluster).toContain('Tech news');
    expect(techCluster).toContain('Phone review');
    expect(techCluster).toContain('Tech innovation');
    
    // Check sports articles cluster
    const sportsCluster = getTitlesForCluster(1);
    expect(sportsCluster).toContain('Sport update');
    expect(sportsCluster).toContain('NBA news');
    expect(sportsCluster).toContain('Basketball update');
    
    // Check politics articles cluster
    const politicsCluster = getTitlesForCluster(2);
    expect(politicsCluster).toContain('Political news');
    expect(politicsCluster).toContain('Government update');
    expect(politicsCluster).toContain('Policy analysis');
    
    // And: Cluster labels should be meaningful
    const labels = Object.values(clusterNames);
    expect(labels).toContain(expect.stringMatching(/Tech/i));
    expect(labels).toContain(expect.stringMatching(/Basketball|NBA/i));
    expect(labels).toContain(expect.stringMatching(/Infrastructure|Political/i));
  });

  it('should cluster single-topic articles with high cohesion', async () => {
    // Given: Articles about a single topic (tech)
    const vectorizer = new Vectorize();
    
    // When: We vectorize and cluster the articles
    const vectorizedArticles = vectorizer.vectorizeArticles(techOnlyArticles);
    const vectors = vectorizedArticles.map(article => article.vector);
    const clusterLabels = clusterVectors(vectors, 0.5, 2);
    const clusterNames = labelClusters(techOnlyArticles, clusterLabels);
    
    // Then: All articles should be in a single cluster
    const uniqueClusters = new Set(clusterLabels.filter(label => label !== -1));
    expect(uniqueClusters.size).toBe(1);
    
    // And: All articles should be in the same cluster
    const mainClusterId = clusterLabels[0];
    const articlesInMainCluster = clusterLabels.filter(label => label === mainClusterId).length;
    expect(articlesInMainCluster).toBe(techOnlyArticles.length);
    
    // And: Cluster label should reflect the tech topic
    const labels = Object.values(clusterNames);
    expect(labels[0]).toMatch(/Tech|Apple/i);
  });

  it('should handle empty input gracefully', async () => {
    // Given: Empty article list
    const vectorizer = new Vectorize();
    const emptyArticles: any[] = [];
    
    // When: We try to vectorize and cluster
    const vectorizedArticles = vectorizer.vectorizeArticles(emptyArticles);
    const vectors = vectorizedArticles.map(article => article.vector);
    const clusterLabels = clusterVectors(vectors);
    const clusterNames = labelClusters(emptyArticles, clusterLabels);
    
    // Then: Results should be empty but not throw errors
    expect(vectorizedArticles).toHaveLength(0);
    expect(clusterLabels).toHaveLength(0);
    expect(Object.keys(clusterNames)).toHaveLength(0);
  });
});