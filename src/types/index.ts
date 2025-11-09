export interface FeedConfig {
    url: string;
    title: string;
}

export interface ArticleLike {
    id: number;
    title: string;
    content: string;
    link?: string;
    feed: {
        title: string | null;
    };
}

// Note: All other types are imported from @prisma/client