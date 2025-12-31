'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Feed } from '@/types';
import BoardList from './BoardList';
import { ChevronDown, ChevronRight, Folder, FolderPlus, MoreVertical, Trash2, Plus, Link as LinkIcon, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Category {
    id: string;
    name: string;
    subscriptions: { feed: Feed }[];
}

export default function FeedList() {
    const searchParams = useSearchParams();
    const currentFeedId = searchParams.get('feedId');
    const currentCategoryId = searchParams.get('categoryId');
    const queryClient = useQueryClient();

    // State
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [isAddingArticle, setIsAddingArticle] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [articleUrl, setArticleUrl] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch Feeds
    const { data: feeds } = useQuery<Feed[]>({
        queryKey: ['feeds'],
        queryFn: async () => {
            const res = await api.get('/feeds');
            return res.data;
        },
    });

    // Fetch Categories
    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get('/categories');
            return res.data;
        }
    });

    // Mutations
    const createCategoryMutation = useMutation({
        mutationFn: async (name: string) => {
            await api.post('/categories', { name });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setIsCreatingFolder(false);
            setNewFolderName('');
        }
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['feeds'] }); // Feeds become uncategorized
        }
    });

    const moveFeedMutation = useMutation({
        mutationFn: async ({ feedId, categoryId }: { feedId: string, categoryId: string | null }) => {
            await api.put(`/feeds/${feedId}/category`, { categoryId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['feeds'] });
            setMenuOpenId(null);
        }
    });

    const deleteFeedMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/feeds/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feeds'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['stream'] });
        },
    });

    // Helpers
    const toggleCategory = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const saveArticleMutation = useMutation({
        mutationFn: async (url: string) => {
            const res = await api.post('/articles/save', { url });
            return res.data;
        },
        onSuccess: () => {
            setIsAddingArticle(false);
            setArticleUrl('');
            // Invalidate stream to show new article if on 'Saved' page or 'All'
            queryClient.invalidateQueries({ queryKey: ['stream'] });
            alert('Article saved successfully!');
        },
        onError: () => {
            alert('Failed to save article. Please check the URL.');
        }
    });

    const handleSaveArticle = (e: React.FormEvent) => {
        e.preventDefault();
        if (articleUrl.trim()) {
            saveArticleMutation.mutate(articleUrl);
        }
    };

    // ... (existing toggleCategory)

    const handleCreateFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFolderName.trim()) {
            createCategoryMutation.mutate(newFolderName);
        }
    };

    // Filter uncategorized feeds
    const categorizedFeedIds = new Set(categories?.flatMap(c => c.subscriptions.map(s => s.feed.id)) || []);
    const uncategorizedFeeds = feeds?.filter(f => !categorizedFeedIds.has(f.id)) || [];

    const FeedItem = ({ feed, categoryId }: { feed: Feed, categoryId?: string }) => (
        <div className="group flex items-center justify-between px-2 py-1 hover:bg-[#1a1a1a] rounded-md relative">
            <Link
                href={`/?feedId=${feed.id}`}
                className={`block text-sm truncate flex-1 ${currentFeedId === feed.id ? 'text-green-500' : 'text-gray-400 group-hover:text-gray-200'}`}
            >
                {feed.title || feed.url}
            </Link>

            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpenId(feed.id); }}
                className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1"
            >
                <MoreVertical size={14} />
            </button>

            {/* Context Menu */}
            {menuOpenId === feed.id && (
                <div ref={menuRef} className="absolute right-0 top-6 z-50 w-48 bg-[#222] border border-[#333] rounded-md shadow-lg py-1">
                    <div className="px-2 py-1 text-xs text-gray-500 font-semibold">Move to...</div>
                    <button
                        onClick={() => moveFeedMutation.mutate({ feedId: feed.id, categoryId: null })}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#333] ${!categoryId ? 'text-green-500' : 'text-gray-300'}`}
                    >
                        Uncategorized
                    </button>
                    {categories?.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => moveFeedMutation.mutate({ feedId: feed.id, categoryId: cat.id })}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#333] ${categoryId === cat.id ? 'text-green-500' : 'text-gray-300'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                    <div className="border-t border-[#333] my-1"></div>
                    <button
                        onClick={() => deleteFeedMutation.mutate(feed.id)}
                        className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-[#333]"
                    >
                        Delete Feed
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-1 pb-20">
            <div className="px-4 py-1 mb-4">
                <Link
                    href="/?type=saved"
                    className={`block text-sm font-medium py-1.5 px-2 rounded-md ${searchParams.get('type') === 'saved' ? 'bg-green-900/20 text-green-500' : 'text-gray-300 hover:text-white hover:bg-[#1a1a1a]'}`}
                >
                    Saved For Later
                </Link>
            </div>

            <div className="flex items-center justify-between px-4 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Feeds
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddingArticle(!isAddingArticle)}
                        className={`text-gray-500 hover:text-green-500 transition-colors ${isAddingArticle ? 'text-green-500' : ''}`}
                        title="Save Article from URL"
                    >
                        <LinkIcon size={16} />
                    </button>
                    <button
                        onClick={() => setIsCreatingFolder(true)}
                        className="text-gray-500 hover:text-green-500 transition-colors"
                        title="New Folder"
                    >
                        <FolderPlus size={16} />
                    </button>
                </div>
            </div>

            {/* Quick Save URL Input */}
            {isAddingArticle && (
                <form onSubmit={handleSaveArticle} className="px-4 mb-2">
                    <div className="flex items-center bg-[#222] rounded border border-[#333] px-2 relative">
                        <input
                            autoFocus
                            type="url"
                            placeholder="Paste article URL..."
                            value={articleUrl}
                            onChange={(e) => setArticleUrl(e.target.value)}
                            disabled={saveArticleMutation.isPending}
                            className="bg-transparent border-none text-sm text-white w-full py-1 focus:ring-0 pr-6"
                        />
                        <button
                            type="button"
                            onClick={() => setIsAddingArticle(false)}
                            className="absolute right-2 text-gray-500 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    {saveArticleMutation.isPending && (
                        <div className="text-xs text-green-500 px-1 mt-1">Saving...</div>
                    )}
                </form>
            )}

            <div className="px-4 py-1">
                <Link
                    href="/"
                    className={`block text-sm py-1.5 px-2 rounded-md ${!currentFeedId && !currentCategoryId && !searchParams.get('type') ? 'bg-green-900/20 text-green-500' : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a]'}`}
                >
                    All Feeds
                </Link>
            </div>

            {/* Create Folder Input */}
            {isCreatingFolder && (
                <form onSubmit={handleCreateFolder} className="px-4 mb-2">
                    <div className="flex items-center bg-[#222] rounded border border-[#333] px-2">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Folder name..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onBlur={() => !newFolderName && setIsCreatingFolder(false)}
                            className="bg-transparent border-none text-sm text-white w-full py-1 focus:ring-0"
                        />
                    </div>
                </form>
            )}

            {/* Categories / Folders */}
            {categories?.map(category => (
                <div key={category.id}>
                    <div className={`flex items-center justify-between group px-4 py-0.5 rounded-md transition-colors ${currentCategoryId === category.id ? 'bg-[#1a1a1a]' : 'hover:bg-[#1a1a1a]'}`}>
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                            <button
                                onClick={(e) => toggleCategory(e, category.id)}
                                className="text-gray-500 hover:text-gray-300 p-1"
                            >
                                {expandedCategories[category.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>

                            <Link
                                href={`/?categoryId=${category.id}`}
                                className={`flex-1 truncate text-sm py-1 flex items-center gap-2 ${currentCategoryId === category.id ? 'text-green-500' : 'text-gray-400 group-hover:text-gray-200'}`}
                            >
                                <Folder size={14} />
                                {category.name}
                            </Link>
                        </div>

                        <button
                            onClick={() => { if (confirm('Delete folder? Feeds will be moved to Uncategorized.')) deleteCategoryMutation.mutate(category.id) }}
                            className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>

                    {expandedCategories[category.id] && (
                        <div className="ml-4 pl-2 border-l border-[#333] space-y-0.5 mt-1">
                            {category.subscriptions.map(sub => (
                                <FeedItem key={sub.feed.id} feed={sub.feed} categoryId={category.id} />
                            ))}
                            {category.subscriptions.length === 0 && (
                                <div className="text-xs text-gray-600 px-3 py-1">Empty folder</div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Uncategorized Feeds */}
            <div className="mt-2 space-y-0.5 px-2">
                {uncategorizedFeeds.map((feed) => (
                    <FeedItem key={feed.id} feed={feed} />
                ))}
            </div>

            <div className="my-6 border-t border-[#333] mx-4" />

            <BoardList />
        </div>
    );
}
