export interface FeedConfig {
    url: string;
    title: string;
}

export interface ArticleLike {
    id: number;
    title: string;
    content: string;
}

// Note: All other types are imported from @prisma/client