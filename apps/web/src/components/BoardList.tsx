'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Board } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BoardList() {
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const queryClient = useQueryClient();
    const router = useRouter();

    const { data: boards } = useQuery<Board[]>({
        queryKey: ['boards'],
        queryFn: async () => {
            const res = await api.get('/boards');
            return res.data;
        }
    });

    const createBoardMutation = useMutation({
        mutationFn: async (name: string) => {
            await api.post('/boards', { name });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boards'] });
            setIsCreating(false);
            setNewBoardName('');
        }
    });

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between px-4 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Boards
                </h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                    +
                </button>
            </div>

            <ul className="space-y-1">
                {boards?.map((board) => (
                    <li key={board.id}>
                        <button
                            onClick={() => router.push(`/?boardId=${board.id}`)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 transition-colors flex items-center justify-between group rounded-md mx-2"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">#</span>
                                <span className="truncate">{board.name}</span>
                            </div>
                            {board._count?.items ? (
                                <span className="text-xs text-gray-600 group-hover:text-gray-500">
                                    {board._count.items}
                                </span>
                            ) : null}
                        </button>
                    </li>
                ))}
            </ul>

            {isCreating && (
                <div className="px-4 mt-2">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (newBoardName.trim()) {
                                createBoardMutation.mutate(newBoardName);
                            }
                        }}
                        className="flex flex-col gap-2"
                    >
                        <input
                            type="text"
                            value={newBoardName}
                            onChange={(e) => setNewBoardName(e.target.value)}
                            placeholder="Board Name"
                            className="w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={createBoardMutation.isPending}
                                className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                Create
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
