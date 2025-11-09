import { describe, it, expect } from 'vitest';
import { labelClusters } from '../src/services/cluster';

describe('labelClusters', () => {
  it('generates human readable labels for clusters based on common terms', () => {
    const articles = [
      { id: 1, title: 'Latest Tech News in AI and Machine Learning', content: 'AI developments...' },
      { id: 2, title: 'Artificial Intelligence Breakthroughs', content: 'New AI models...' },
      { id: 3, title: 'Sports: World Cup Final Results', content: 'The match ended...' },
      { id: 4, title: 'Soccer Championship Updates', content: 'In the latest game...' },
      { id: 5, title: 'Random Unrelated Article', content: 'misc content...' }
    ];

    const clusterLabels = [0, 0, 1, 1, -1]; // Two clusters (0: AI, 1: Sports) and one noise point (-1)
    
    const labels = labelClusters(articles, clusterLabels);

    // Should return an object mapping cluster IDs to labels
    expect(labels).toBeInstanceOf(Object);
    
    // Check if we have labels for each valid cluster
    expect(Object.keys(labels)).toContain('0');
    expect(Object.keys(labels)).toContain('1');
    
    // The AI cluster label should contain relevant terms
    expect(labels['0'].toLowerCase()).toMatch(/ai|artificial intelligence|tech/);
    
    // The sports cluster label should contain relevant terms
    expect(labels['1'].toLowerCase()).toMatch(/sports|soccer|championship/);
    
    // Noise label
    expect(labels['-1']).toBe('Other')
  });

  it('handles empty clusters and single-article clusters appropriately', () => {
    const articles = [
      { id: 1, title: 'Single Article in Cluster', content: 'content...' },
      { id: 2, title: 'Noise Article', content: 'random content...' }
    ];

    const clusterLabels = [0, -1]; // One single-article cluster and one noise point
    
    const labels = labelClusters(articles, clusterLabels);

    // Should still generate a label for a single-article cluster
    expect(labels['0']).toBeDefined();
    expect(typeof labels['0']).toBe('string');
    expect(labels['0'].length).toBeGreaterThan(0);
    
    // noise
    expect(labels['-1']).toBe('Other');
  });
});