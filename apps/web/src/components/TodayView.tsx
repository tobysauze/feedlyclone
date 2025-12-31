'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Article } from '@/types';
import Link from 'next/link';
import { Clock, CheckCircle } from 'lucide-react';
import ArticleActions from './ArticleActions';

export default function TodayView() {
    const { data: articles, isLoading } = useQuery<Article[]>({
        queryKey: ['stream'],
        queryFn: async () => {
            const res = await api.get('/stream?limit=20');
            return res.data;
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading your day...</div>;

    const hero = articles?.[0];
    const grid = articles?.slice(1);

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-100">Today</h1>
                    <p className="text-gray-400 mt-1">The insights you need to keep ahead</p>
                </div>
                <div className="flex gap-4 text-sm font-medium text-gray-400">
                    <button className="text-white border-b-2 border-green-500 pb-1">Me</button>
                    <button className="hover:text-white transition-colors">Explore</button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hero && (
                    <Link href={hero.link} target="_blank" className="col-span-1 md:col-span-2 lg:col-span-1 group block relative">
                        <article className="h-full bg-[var(--card-bg)] rounded-xl overflow-hidden border border-[#333] hover:border-gray-600 transition-all">
                            <div className="h-48 bg-gradient-to-br from-purple-900 to-blue-900 relative group/card">
                                {hero.imageUrl ? (
                                    <img
                                        src={hero.imageUrl}
                                        alt={hero.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-4xl font-bold">
                                        IMG
                                    </div>
                                )}

                                {/* Actions Overlay - Visible on hover */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 z-10">
                                    <ArticleActions article={hero} variant="overlay" />
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-gray-100 leading-tight mb-3 group-hover:text-green-500 transition-colors">
                                    {hero.title}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                                    <span className="text-green-400 font-medium">{hero.feed?.title || 'Source'}</span>
                                    <span>•</span>
                                    <span>{new Date(hero.pubDate!).getHours()}h</span>
                                </div>
                                <p className="text-sm text-gray-400 line-clamp-3">
                                    {hero.content?.replace(/<[^>]*>?/gm, '').slice(0, 150)}...
                                </p>
                            </div>
                        </article>
                    </Link>
                )}

                {grid?.map((article) => (
                    <Link key={article.id} href={article.link} target="_blank" className="group block relative">
                        <article className="h-full bg-[var(--card-bg)] rounded-xl overflow-hidden border border-[#333] hover:border-gray-600 transition-all flex flex-col">
                            <div className="h-40 bg-[#222] relative overflow-hidden group/card">
                                {article.imageUrl ? (
                                    <img
                                        src={article.imageUrl}
                                        alt={article.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-sm">
                                        No Image
                                    </div>
                                )}
                                <div className="hidden absolute inset-0 flex items-center justify-center text-gray-700 text-sm bg-[#222]">No Image</div>

                                {/* Actions Overlay - Visible on hover */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 z-10">
                                    <ArticleActions article={article} variant="overlay" />
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="text-base font-semibold text-gray-200 leading-snug mb-2 group-hover:text-green-500 transition-colors line-clamp-2">
                                    {article.title}
                                </h3>
                                <div className="mt-auto flex items-center justify-between text-xs text-gray-500 pt-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">{article.feed?.title}</span>
                                        <span>•</span>
                                        <span>{new Date(article.pubDate!).toLocaleDateString()}</span>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-green-500">
                                        <Clock size={14} />
                                    </button>
                                </div>
                            </div>
                        </article>
                    </Link>
                ))}
            </div>
        </div>
    );
}
