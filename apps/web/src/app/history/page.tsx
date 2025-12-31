'use client';

import ArticleStream from '@/components/ArticleStream';

export default function HistoryPage() {
    return (
        <ArticleStream
            type="history"
            title="Recently Read"
            emptyMessage="No reading history found."
        />
    );
}
