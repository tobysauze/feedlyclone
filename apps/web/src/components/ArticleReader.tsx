
'use client';

import { Article, Board } from '@/types';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ArticleReaderProps {
    article: Article;
    onClose: () => void;
}

export default function ArticleReader({ article, onClose }: ArticleReaderProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const queryClient = useQueryClient();

    const markAsReadMutation = useMutation({
        mutationFn: async () => {
            await api.post(`/articles/${article.id}/read`, { read: true });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stream'] });
            // Optionally close
            // onClose();
        }
    });

    const [isBoardPopoverOpen, setIsBoardPopoverOpen] = useState(false);

    const { data: boards } = useQuery<Board[]>({
        queryKey: ['boards'],
        queryFn: async () => {
            const res = await api.get('/boards');
            return res.data;
        },
        enabled: isBoardPopoverOpen // Only fetch when needed
    });

    const addToBoardMutation = useMutation({
        mutationFn: async (boardId: string) => {
            await api.post(`/boards/${boardId}/articles`, { articleId: article.id });
        },
        onSuccess: () => {
            setIsBoardPopoverOpen(false);
            // Could add toast here
        }
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-100 bg-white z-10">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                            <span className="font-medium text-blue-600">
                                {article.feed?.title || 'Unknown Source'}
                            </span>
                            <span>•</span>
                            <span>{new Date(article.pubDate!).toLocaleDateString()}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                            {article.title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10">
                    {/* AI Summary Badge */}
                    {article.aiSummary && (
                        <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold uppercase text-xs tracking-wider">
                                <span>✨</span>
                                AI Summary
                            </div>
                            <p className="text-blue-900 leading-relaxed text-base">
                                {article.aiSummary}
                            </p>
                        </div>
                    )}

                    {/* Main Content */}
                    <div
                        className="prose prose-lg max-w-none text-gray-800
                            prose-headings:font-bold prose-headings:text-gray-900
                            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                            prose-img:rounded-lg prose-img:shadow-sm"
                        dangerouslySetInnerHTML={{
                            __html: article.content || article.summary || '<p>No content available.</p>'
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setIsBoardPopoverOpen(!isBoardPopoverOpen)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span>⭐</span> Save to Board
                        </button>

                        {isBoardPopoverOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-20">
                                <div className="p-2 border-b border-gray-50 bg-gray-50 text-xs font-semibold text-gray-500">
                                    Select Board
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {boards?.map(board => (
                                        <button
                                            key={board.id}
                                            onClick={() => addToBoardMutation.mutate(board.id)}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                        >
                                            {board.name}
                                        </button>
                                    ))}
                                    {boards?.length === 0 && (
                                        <div className="p-4 text-center text-xs text-gray-400">
                                            No boards found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => markAsReadMutation.mutate()}
                        disabled={markAsReadMutation.isPending || article.isRead}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {article.isRead ? 'Read' : (markAsReadMutation.isPending ? 'Marking...' : 'Mark as Read')}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                    <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                        Read Original
                        <span className="text-xs">↗</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
