import { writeFileSync } from 'fs';
import { Vectorize } from '../src/services/vectorize';
import { labelClusters } from '../src/services/cluster';
import {
  KMeansStrategy,
  HierarchicalStrategy,
  AffinityPropagationStrategy,
  AdaptiveDBSCANStrategy
} from '../src/services/clusterStrategies';
import { evaluateClustering } from '../src/services/clusterEvaluation';
import { realArticles } from './mocks/real-articles-simple';

interface StrategyResult {
  name: string;
  params: any;
  labels: number[];
  metrics: any;
}

function generateReport() {
  console.log('Generating clustering comparison report...');

  const vectorizer = new Vectorize();
  const vectorizedArticles = vectorizer.vectorizeArticles(realArticles as any);
  const vectors = vectorizedArticles.map(article => article.vector);

  const results: StrategyResult[] = [];

  // Test multiple configurations of each strategy
  const strategies = [
    { strategy: new KMeansStrategy(), name: 'K-Means (k=3)', params: { k: 3, seed: 42 } },
    { strategy: new KMeansStrategy(), name: 'K-Means (k=4)', params: { k: 4, seed: 42 } },
    { strategy: new KMeansStrategy(), name: 'K-Means (k=5)', params: { k: 5, seed: 42 } },
    { strategy: new KMeansStrategy(), name: 'K-Means (k=6)', params: { k: 6, seed: 42 } },

    { strategy: new HierarchicalStrategy(), name: 'Hierarchical (4 clusters, average)', params: { numClusters: 4, linkage: 'average' } },
    { strategy: new HierarchicalStrategy(), name: 'Hierarchical (5 clusters, average)', params: { numClusters: 5, linkage: 'average' } },
    { strategy: new HierarchicalStrategy(), name: 'Hierarchical (5 clusters, single)', params: { numClusters: 5, linkage: 'single' } },
    { strategy: new HierarchicalStrategy(), name: 'Hierarchical (6 clusters, average)', params: { numClusters: 6, linkage: 'average' } },

    { strategy: new AffinityPropagationStrategy(), name: 'Affinity Propagation (damping=0.5)', params: { damping: 0.5 } },
    { strategy: new AffinityPropagationStrategy(), name: 'Affinity Propagation (damping=0.7)', params: { damping: 0.7 } },

    { strategy: new AdaptiveDBSCANStrategy(), name: 'DBSCAN (ε=0.9, minPts=2)', params: { epsilon: 0.9, minPts: 2 } },
    { strategy: new AdaptiveDBSCANStrategy(), name: 'DBSCAN (ε=0.8, minPts=2)', params: { epsilon: 0.8, minPts: 2 } },
    { strategy: new AdaptiveDBSCANStrategy(), name: 'DBSCAN (ε=0.7, minPts=2)', params: { epsilon: 0.7, minPts: 2 } },
  ];

  for (const { strategy, name, params } of strategies) {
    const labels = strategy.cluster(vectors, params);
    const metrics = evaluateClustering(vectors, labels);
    results.push({ name, params, labels, metrics });
  }

  // Generate markdown report
  let markdown = `# Clustering Strategies Comparison Report

Generated: ${new Date().toISOString()}

Total Articles: ${realArticles.length}

## Summary Table

| Strategy | Clusters | Noise | Silhouette | DB Index | Cluster Sizes |
|----------|----------|-------|------------|----------|---------------|
`;

  for (const result of results) {
    const sizes = result.metrics.clusterSizes.join(', ');
    markdown += `| ${result.name} | ${result.metrics.numClusters} | ${result.metrics.numNoise} | ${result.metrics.silhouetteScore.toFixed(4)} | ${result.metrics.daviesBouldinIndex.toFixed(4)} | [${sizes}] |\n`;
  }

  markdown += `\n---\n\n`;

  // Detailed results for each strategy
  for (const result of results) {
    markdown += `## ${result.name}\n\n`;
    markdown += `**Parameters:** \`${JSON.stringify(result.params)}\`\n\n`;
    markdown += `**Metrics:**\n`;
    markdown += `- Silhouette Score: ${result.metrics.silhouetteScore.toFixed(4)}\n`;
    markdown += `- Davies-Bouldin Index: ${result.metrics.daviesBouldinIndex.toFixed(4)}\n`;
    markdown += `- Number of Clusters: ${result.metrics.numClusters}\n`;
    markdown += `- Noise Points: ${result.metrics.numNoise}\n`;
    markdown += `- Cluster Sizes: [${result.metrics.clusterSizes.join(', ')}]\n\n`;

    // Get cluster names
    const clusterNames = labelClusters(realArticles as any, result.labels);

    // Group articles by cluster
    const clusterGroups = new Map<number, typeof realArticles>();
    const noiseArticles: typeof realArticles = [];

    realArticles.forEach((article, idx) => {
      const label = result.labels[idx];
      if (label === -1) {
        noiseArticles.push(article);
      } else {
        if (!clusterGroups.has(label)) {
          clusterGroups.set(label, []);
        }
        clusterGroups.get(label)!.push(article);
      }
    });

    // Output clusters
    for (const [clusterId, articles] of Array.from(clusterGroups.entries()).sort((a, b) => a[0] - b[0])) {
      const clusterName = clusterNames[clusterId] || `Cluster ${clusterId}`;
      markdown += `### Cluster ${clusterId + 1}: "${clusterName}" (${articles.length} articles)\n\n`;

      for (const article of articles) {
        markdown += `- ${article.title}\n`;
        if (article.link) {
          markdown += `  - URL: ${article.link}\n`;
        }
      }
      markdown += `\n`;
    }

    // Output noise if any
    if (noiseArticles.length > 0) {
      markdown += `### Noise/Outliers (${noiseArticles.length} articles)\n\n`;
      for (const article of noiseArticles) {
        markdown += `- ${article.title}\n`;
        if (article.link) {
          markdown += `  - URL: ${article.link}\n`;
        }
      }
      markdown += `\n`;
    }

    markdown += `---\n\n`;
  }

  // Add interpretation guide
  markdown += `## Interpretation Guide

### Metrics Explanation

**Silhouette Score** (range: -1 to 1, higher is better)
- > 0.5: Strong, well-separated clusters
- 0.25-0.5: Reasonable structure
- 0-0.25: Weak structure
- < 0: Poor clustering (points likely in wrong clusters)

**Davies-Bouldin Index** (range: 0 to ∞, lower is better)
- < 1: Good cluster separation
- 1-2: Moderate separation
- > 2: Poor separation

### What to Look For

1. **Cluster Balance**: Are cluster sizes reasonable, or is everything in one big cluster?
2. **Logical Grouping**: Do articles in the same cluster make semantic sense together?
3. **Noise Handling**: For DBSCAN, are outliers correctly identified?
4. **Topic Separation**: Are different topics (AI, startups, tech news) separated?

### Current Data Challenges

The low silhouette scores (0.003-0.014) across all strategies indicate:
- Articles are very similar in TF-IDF vector space
- Short titles don't provide enough discriminative features
- Need richer text features (full article content, semantic embeddings)

`;

  const outputPath = 'clustering-comparison-report.md';
  writeFileSync(outputPath, markdown);
  console.log(`Report saved to: ${outputPath}`);
  console.log(`\nOpen the file to compare how different strategies grouped your articles!`);
}

generateReport();
