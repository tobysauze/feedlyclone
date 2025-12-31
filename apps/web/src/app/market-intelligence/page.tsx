'use client';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface EntityMetric {
    date: string;
    count: number;
    sentiment: number;
}

interface Entity {
    id: string;
    name: string;
    type: string;
    growth: 'EXPLODING' | 'SURGING' | 'GROWING' | 'STABLE' | 'DECLINING';
    size: 'MAINSTREAM' | 'KNOWN' | 'NICHE';
    _count: { articles: number };
    metrics: EntityMetric[];
}

export default function MarketIntelligencePage() {
    const { data: trends, isLoading } = useQuery<Entity[]>({
        queryKey: ['trends'],
        queryFn: async () => {
            const res = await api.get('/market-intelligence/trends');
            return res.data;
        }
    });


    const handleExport = () => {
        if (!trends) return;

        const headers = ['Name', 'Type', 'Growth', 'Size', 'Count'];
        const rows = trends.map(t => [
            t.name,
            t.type,
            t.growth,
            t.size,
            t._count.articles
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'emerging-trends.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <Suspense fallback={<div>Loading trends...</div>}>
            <div className="max-w-6xl mx-auto px-8 py-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Emerging Trends Dashboard</h1>
                    <p className="text-gray-500">Real-time monitoring of key companies and technologies</p>
                </header>

                {/* Controls */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search trends..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-sm"
                        />
                    </div>
                    <select className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
                        <option>Last 12 months</option>
                        <option>Last 30 days</option>
                    </select>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm hover:bg-gray-50 font-medium"
                    >
                        Export
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Emerging Trend</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">References</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Growth</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">24H Evolution</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading trends...</td></tr>
                            ) : trends?.map((trend) => (
                                <tr key={trend.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6">
                                        <Link href={`/market-intelligence/entity/${trend.id}`} className="block">
                                            <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                                                {trend.name}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{trend.type}</div>
                                        </Link>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex -space-x-1">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-500">
                                                    {i}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <Badge status={trend.growth} />
                                    </td>
                                    <td className="py-4 px-6 w-32">
                                        <div className="h-10 w-24">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={trend.metrics}>
                                                    <Line
                                                        type="monotone"
                                                        dataKey="count"
                                                        stroke="#10b981"
                                                        strokeWidth={2}
                                                        dot={false}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                            {trend.size}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Suspense>
    );
}

function Badge({ status }: { status: string }) {
    const styles = {
        EXPLODING: 'bg-red-50 text-red-700 border-red-100',
        SURGING: 'bg-orange-50 text-orange-700 border-orange-100',
        GROWING: 'bg-green-50 text-green-700 border-green-100',
        STABLE: 'bg-blue-50 text-blue-700 border-blue-100',
        DECLINING: 'bg-gray-50 text-gray-600 border-gray-100',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.STABLE}`}>
            {status}
        </span>
    );
}
