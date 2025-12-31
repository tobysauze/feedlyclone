'use client';
import { Suspense } from 'react';

import Link from 'next/link';
import FeedList from './FeedList';
import AddFeed from './AddFeed';
import { LayoutDashboard } from 'lucide-react';

export default function Sidebar() {
    return (
        <aside className="w-64 bg-[var(--sidebar-bg)] border-r border-[#333] flex flex-col h-full text-gray-300">
            <div className="p-4 border-b border-gray-200">
                <Link href="/" className="block">
                    <h1 className="text-xl font-bold text-gray-100">Feedly Clone</h1>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                <div className="px-4 py-2 space-y-1">
                    <Link
                        href="/today"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md group"
                    >
                        <LayoutDashboard size={18} className="text-gray-400 group-hover:text-green-600" />
                        Today
                    </Link>
                    <Link
                        href="/market-intelligence"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md group"
                    >
                        <span className="text-gray-400 group-hover:text-green-600">⚡</span>
                        Market Intelligence
                    </Link>
                    <Link
                        href="/saved"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md group"
                    >
                        <span className="text-gray-400 group-hover:text-green-600">🔖</span>
                        Read Later
                    </Link>
                    <Link
                        href="/history"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md group"
                    >
                        <span className="text-gray-400 group-hover:text-green-600">🕒</span>
                        Recently Read
                    </Link>
                </div>

                <div className="my-4 border-t border-gray-100" />

                <Suspense fallback={<div className="p-4 text-xs text-gray-500">Loading feeds...</div>}>
                    <FeedList />
                </Suspense>
            </div>

            <AddFeed />
        </aside>
    );
}
