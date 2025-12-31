'use client';

import ArticleStream from '@/components/ArticleStream';

export default function SavedPage() {
    return (
        <ArticleStream
            type="saved"
            title="Read Later"
            emptyMessage="No articles saved for later yet."
        />
    );
}
