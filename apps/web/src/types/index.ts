export interface Feed {
    id: string;
    url: string;
    title: string | null;
    description: string | null;
    siteUrl: string | null;
    iconUrl: string | null;
    lastCrawledAt: string | null;
    errorCount: number;
}

export interface Article {
    id: string;
    title: string;
    content: string | null;
    summary: string | null;
    aiSummary?: string | null;
    imageUrl?: string | null;
    link: string;
    pubDate: string | null;
    feedId: string;
    feed?: Feed;
    isRead?: boolean;
    isSaved?: boolean;
}

export interface Board {
    id: string;
    name: string;
    description: string | null;
    items?: BoardItem[];
    _count?: {
        items: number;
    };
}

export interface BoardItem {
    id: string;
    boardId: string;
    articleId: string;
    article: Article;
    createdAt: string;
}
