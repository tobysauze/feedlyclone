import { Suspense } from 'react';
import ArticleStream from '@/components/ArticleStream';

export default function Home() {
  return (
    <Suspense fallback={<div>Loading articles...</div>}>
      <ArticleStream />
    </Suspense>
  );
}
