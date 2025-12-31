'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface EntityMetric {
    date: string;
    count: number;
    sentiment: number;
}

interface Article {
    id: string;
    title: string;
    link: string;
    pubDate: string;
    feed: { title: string };
}

interface Entity {
    id: string;
    name: string;
    type: string;
    growth: string;
    size: string;
    description?: string;
    metrics: EntityMetric[];
    articles: Article[];
}


import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

// ... imports

export default function EntityPage() {
    const params = useParams();
    const id = params.id as string;
    const [aiQuery, setAiQuery] = useState('');

    const { data: entity, isLoading } = useQuery<Entity>({
        queryKey: ['entity', id],
        queryFn: async () => {
            const res = await api.get(`/market-intelligence/entity/${id}`);
            return res.data;
        },
        enabled: !!id
    });

    const aiMutation = useMutation({
        mutationFn: async (query: string) => {
            const res = await api.post('/ai/ask', { query, context: { entityId: id } });
            return res.data;
        }
    });


    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading insights...</div>;
    if (!entity) return <div className="p-8 text-center text-gray-500">Entity not found</div>;

    return (
        <div className="max-w-6xl mx-auto px-8 py-8">
            <Link href="/market-intelligence" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                <ArrowLeft size={16} className="mr-1" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <header className="mb-8 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-4xl font-bold text-gray-900">{entity.name}</h1>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full uppercase tracking-wide">
                            {entity.growth}
                        </span>
                    </div>
                    <div className="text-gray-500 flex items-center gap-4 text-sm">
                        <span>{entity.type}</span>
                        <span>•</span>
                        <span>{entity.size}</span>
                        {entity.description && (
                            <>
                                <span>•</span>
                                <span>{entity.description}</span>
                            </>
                        )}
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md shadow hover:shadow-lg transition-all font-medium">
                    <Sparkles size={16} />
                    Synthesize Report
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Evolution (Last 7 Days)</h2>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={entity.metrics}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { weekday: 'short' })}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                                        formatter={(value: any) => [value, 'Mentions']}
                                        itemStyle={{ color: '#10b981', fontWeight: 600 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Mentions</h2>
                        <div className="space-y-4">
                            {entity.articles.map((article) => (
                                <a
                                    key={article.id}
                                    href={article.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-sm transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-medium text-gray-900 group-hover:text-green-700 transition-colors">
                                            {article.title}
                                        </h3>
                                        <ExternalLink size={14} className="text-gray-400 group-hover:text-green-500" />
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                        <span className="font-medium text-gray-700">{article.feed.title}</span>
                                        <span>•</span>
                                        <span>{new Date(article.pubDate).toLocaleDateString()}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar Stats (AI Insights placeholder) */}
                <div className="space-y-6">
                    <section className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-2 mb-3 text-indigo-800">
                            <Sparkles size={18} />
                            <h3 className="font-semibold">AI Assistant</h3>
                        </div>
                        <p className="text-sm text-indigo-900/80 leading-relaxed mb-4">
                            Ask for deep synthesis, competitor analysis, or tailored reports on {entity.name}.
                        </p>
                        <div className="relative mb-4">
                            <input
                                type="text"
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && aiMutation.mutate(aiQuery)}
                                placeholder="Ask a question..."
                                className="w-full pl-3 pr-10 py-2 text-sm border-indigo-200 rounded-md focus:border-indigo-400 focus:ring-indigo-400 bg-white"
                            />
                            <button
                                onClick={() => aiMutation.mutate(aiQuery)}
                                disabled={aiMutation.isPending}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-700 disabled:opacity-50"
                            >
                                {aiMutation.isPending ? '...' : '→'}
                            </button>
                        </div>
                        {aiMutation.data && (
                            <div className="bg-white/50 p-3 rounded-lg text-sm text-indigo-900 border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                                <p className="markdown whitespace-pre-wrap">{aiMutation.data.answer}</p>
                            </div>
                        )}
                    </section>

                    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-semibold text-gray-900 mb-4">Key Metrics</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Sentiment</div>
                                <div className="text-lg font-medium text-green-600">Positive (+0.8)</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Volume</div>
                                <div className="text-lg font-medium text-gray-900">High</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
