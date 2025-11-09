export interface Feed {
  id: number;
  url: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  link: string;
  feedId: number;
  feed: Feed;
  clusterId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Cluster {
  id: number;
  keywords: string;
  articles: Article[];
  createdAt: string;
  updatedAt: string;
}
