'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Article } from '@/types';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ArticleReader from './ArticleReader';
import ArticleActions from './ArticleActions';
import { LayoutGrid, List, Search } from 'lucide-react';

export default function ArticleStream({
    type = 'all',
    title,
    emptyMessage
}: {
    type?: 'all' | 'saved' | 'history',
    title?: string,
    emptyMessage?: string
}) {
    const searchParams = useSearchParams();
    const feedId = searchParams.get('feedId');
    const categoryId = searchParams.get('categoryId');
    const boardId = searchParams.get('boardId');
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data, isLoading, error } = useQuery<{ articles: Article[], title?: string }>({
        queryKey: ['stream', feedId, categoryId, boardId, type, debouncedSearch],
        queryFn: async () => {
            if (boardId) {
                const res = await api.get(`/boards/${boardId}`);
                // Fix: explicit type or just simplified map
                return {
                    articles: res.data.items.map((item: { article: Article }) => item.article),
                    title: `# ${res.data.name}`
                };
            }

            const params = {
                feedId,
                categoryId,
                type: type !== 'all' ? type : undefined,
                search: debouncedSearch || undefined
            };
            const res = await api.get('/stream', { params });

            // Determine dynamic title
            let dynamicTitle = undefined;
            if (feedId && res.data.length > 0) dynamicTitle = res.data[0].feed?.title;
            if (categoryId) dynamicTitle = 'Folder View'; // Could fetch category name but this is okay for now

            return { articles: res.data, title: dynamicTitle };
        },
    });

    const articles = data?.articles;
    const displayTitle = data?.title || title || 'Today';

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading articles...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error loading articles</div>;

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-black">{displayTitle}</h1>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-[#222] border border-[#333] text-gray-200 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-48 transition-all hover:border-[#444]"
                        />
                    </div>

                    <div className="flex bg-[#222] rounded-lg p-1 border border-[#333]">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-[#333] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Cards View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#333] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {articles?.map((article) => (
                viewMode === 'cards' ? (
                    <article
                        key={article.id}
                        className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group ${article.isRead ? 'opacity-60' : ''}`}
                    >
                        {article.imageUrl && (
                            <div className="h-48 overflow-hidden relative group/image">
                                <img
                                    src={article.imageUrl}
                                    alt={article.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                                />
                            </div>
                        )}
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-blue-600">
                                        {article.feed?.title || 'Unknown Source'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(article.pubDate!).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArticleActions article={article} variant="inline" />
                                </div>
                            </div>

                            <h2 className="text-xl font-semibold text-gray-900 mb-2 leading-tight">
                                <button
                                    onClick={() => setSelectedArticle(article)}
                                    className="text-left hover:text-blue-600 transition-colors"
                                >
                                    {article.title}
                                </button>
                            </h2>

                            {article.aiSummary && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                                    <div className="flex items-center gap-1 mb-1">
                                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">✨ AI Summary</span>
                                    </div>
                                    <p className="text-sm text-blue-900 leading-relaxed">
                                        {article.aiSummary}
                                    </p>
                                </div>
                            )}

                            {article.summary && !article.aiSummary && (
                                <div
                                    className="text-gray-600 text-sm line-clamp-3 mb-4"
                                    dangerouslySetInnerHTML={{ __html: article.summary }}
                                />
                            )}

                            <div className="flex justify-end">
                                <a
                                    href={article.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                                >
                                    Read more →
                                </a>
                            </div>
                        </div>
                    </article>
                ) : (
                    <article
                        key={article.id}
                        className={`flex items-center justify-between p-3 bg-white border-b border-gray-100 hover:bg-gray-50 group hover:border-l-4 hover:border-l-blue-500 transition-all ${article.isRead ? 'opacity-60 bg-gray-50/50' : ''}`}
                    >
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 shrink-0">
                                    {article.feed?.title || 'Source'}
                                </span>
                                <span className="text-[10px] text-gray-400 shrink-0">
                                    {new Date(article.pubDate!).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 cursor-pointer" onClick={() => setSelectedArticle(article)}>
                                {article.title}
                            </h3>
                            <div className="flex gap-2 mt-1">
                                {article.aiSummary && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded">AI Summary</span>}
                                <span className="text-xs text-gray-400 line-clamp-1">{article.summary?.substring(0, 60).replace(/<[^>]*>?/gm, '')}...</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0">
                            <ArticleActions article={article} variant="inline" />
                        </div>
                    </article>
                )
            ))}

            {articles?.length === 0 && (
                <div className="text-center py-12 bg-[#1a1a1a] rounded-lg border border-dashed border-[#333]">
                    <p className="text-gray-500">{emptyMessage || 'No articles yet. Add some feeds!'}</p>
                </div>
            )}
            {selectedArticle && (
                <ArticleReader
                    article={selectedArticle}
                    onClose={() => setSelectedArticle(null)}
                />
            )}
        </div>
    );
}
