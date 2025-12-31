'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AddFeed() {
    const [url, setUrl] = useState('');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (url: string) => {
            await api.post('/feeds', { url });
        },
        onSuccess: () => {
            setUrl('');
            queryClient.invalidateQueries({ queryKey: ['feeds'] });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url) mutation.mutate(url);
    };

    return (
        <div className="p-4 border-t border-gray-200">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Add RSS URL..."
                    className="flex-1 px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    suppressHydrationWarning
                    required
                />
                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {mutation.isPending ? '...' : '+'}
                </button>
            </form>
            {mutation.isError && (
                <p className="mt-1 text-xs text-red-500">Failed to add feed</p>
            )}
        </div>
    );
}
