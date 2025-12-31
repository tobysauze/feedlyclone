'use client';

import ArticleStream from '@/components/ArticleStream';

import { Suspense } from 'react';

export default function SavedPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ArticleStream
                type="saved"
                title="Read Later"
                emptyMessage="No articles saved for later yet."
            />
        </Suspense>
    );
}
