'use client';

import ArticleStream from '@/components/ArticleStream';

import { Suspense } from 'react';

export default function HistoryPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ArticleStream
                type="history"
                title="Recently Read"
                emptyMessage="No reading history found."
            />
        </Suspense>
    );
}
