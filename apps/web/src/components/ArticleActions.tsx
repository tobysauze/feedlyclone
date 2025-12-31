'use client';

import { useState, useEffect, useRef } from 'react';
import { Article } from '@/types';
import { Bookmark, Star, Check, CheckCircle, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface ArticleActionsProps {
    article: Article;
    variant?: 'overlay' | 'inline';
}

interface Board {
    id: string;
    name: string;
}

export default function ArticleActions({ article, variant = 'inline' }: ArticleActionsProps) {
    const [isSaved, setIsSaved] = useState(article.isSaved || false);
    const [isRead, setIsRead] = useState(article.isRead || false);
    const [isStarred, setIsStarred] = useState(false); // Check if in any board? For now simple toggle state visual
    const [showBoardPicker, setShowBoardPicker] = useState(false);

    // Fix: Remove duplicate pickerRef
    const pickerRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const [isCreatingBoard, setIsCreatingBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');

    const createBoard = async () => {
        if (!newBoardName.trim()) return;
        try {
            const res = await api.post('/boards', { name: newBoardName });
            const newBoard = res.data;
            await queryClient.invalidateQueries({ queryKey: ['boards'] });
            await saveToBoard(newBoard.id);
            setNewBoardName('');
            setIsCreatingBoard(false);
        } catch (err) {
            console.error('Failed to create board', err);
        }
    };

    // Fetch boards for the picker
    const { data: boards } = useQuery<Board[]>({
        queryKey: ['boards'],
        queryFn: async () => {
            const res = await api.get('/boards');
            return res.data;
        },
        enabled: showBoardPicker // Only fetch when picker is open
    });

    // Handle outside click to close picker
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowBoardPicker(false);
            }
        }
        if (showBoardPicker) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showBoardPicker]);

    const toggleSaved = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const newState = !isSaved;
        setIsSaved(newState);

        try {
            await api.post(`/articles/${article.id}/save`, { saved: newState });
            queryClient.invalidateQueries({ queryKey: ['stream'] });
        } catch (err) {
            setIsSaved(!newState); // Revert on error
            console.error('Failed to toggle save', err);
        }
    };

    const toggleRead = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const newState = !isRead;
        setIsRead(newState);

        try {
            await api.post(`/articles/${article.id}/read`, { read: newState });
            queryClient.invalidateQueries({ queryKey: ['stream'] });
        } catch (err) {
            setIsRead(!newState); // Revert
            console.error('Failed to toggle read', err);
        }
    };

    const handleStarClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowBoardPicker(!showBoardPicker);
        // Reset state when opening
        if (!showBoardPicker) {
            setIsCreatingBoard(false);
            setNewBoardName('');
        }
    };

    const saveToBoard = async (boardId: string) => {
        try {
            await api.post(`/boards/${boardId}/articles`, { articleId: article.id });
            setIsStarred(true);
            setShowBoardPicker(false);
            // Optionally notify user
        } catch (err) {
            console.error('Failed to save to board', err);
        }
    };

    // Styles for overlay vs inline
    const containerClasses = variant === 'overlay'
        ? "flex items-center gap-1 bg-[#111]/90 backdrop-blur-md p-1 rounded-md shadow-lg border border-[#333] relative"
        : "flex items-center gap-2 relative";

    const buttonClasses = (active: boolean) => `p-2 rounded-md transition-colors ${active
        ? 'text-green-500 bg-green-900/20'
        : 'text-gray-400 hover:text-gray-200 hover:bg-[#333]'
        }`;

    return (
        <div className={containerClasses} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={toggleSaved}
                className={buttonClasses(isSaved)}
                title={isSaved ? "Remove from Read Later" : "Read Later"}
            >
                <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
            </button>

            <div className="relative">
                <button
                    onClick={handleStarClick}
                    className={buttonClasses(isStarred || showBoardPicker)}
                    title="Save to Board"
                >
                    <Star size={18} fill={isStarred ? "currentColor" : "none"} />
                </button>

                {/* Board Picker Popover */}
                {showBoardPicker && (
                    <div ref={pickerRef} className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl overflow-hidden z-50">
                        <div className="p-2 border-b border-[#333] text-xs font-semibold text-gray-400 bg-[#222]">
                            Save to Board
                        </div>

                        {!isCreatingBoard ? (
                            <>
                                <div className="max-h-48 overflow-y-auto">
                                    {boards?.map(board => (
                                        <button
                                            key={board.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                saveToBoard(board.id);
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white transition-colors flex items-center gap-2"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            {board.name}
                                        </button>
                                    ))}
                                    {boards?.length === 0 && (
                                        <div className="p-3 text-xs text-gray-500 text-center">No boards found</div>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsCreatingBoard(true);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-green-400 hover:bg-[#333] hover:text-green-300 transition-colors border-t border-[#333] flex items-center gap-1"
                                >
                                    <Plus size={12} /> Create Board
                                </button>
                            </>
                        ) : (
                            <div className="p-2">
                                <input
                                    type="text"
                                    value={newBoardName}
                                    onChange={(e) => setNewBoardName(e.target.value)}
                                    placeholder="Board Name"
                                    className="w-full px-2 py-1 text-sm bg-[#111] text-white border border-[#333] rounded mb-2 focus:outline-none focus:border-green-500"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') createBoard();
                                        if (e.key === 'Escape') setIsCreatingBoard(false);
                                    }}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            createBoard();
                                        }}
                                        disabled={!newBoardName.trim()}
                                        className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                    >
                                        Create
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsCreatingBoard(false);
                                        }}
                                        className="flex-1 px-2 py-1 text-xs bg-[#333] text-gray-300 rounded hover:bg-[#444]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <button
                onClick={toggleRead}
                className={buttonClasses(isRead)}
                title={isRead ? "Mark as Unread" : "Mark as Read"}
            >
                {isRead ? <CheckCircle size={18} /> : <Check size={18} />}
            </button>
        </div>
    );
}
