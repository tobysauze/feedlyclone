import Fastify, { FastifyInstance } from 'fastify';
import { prisma } from '@feedly-clone/db';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

import cors from '@fastify/cors';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const server: FastifyInstance = Fastify({ logger: true });

server.register(cors, {
    origin: true // Allow all for now, in prod restrict to frontend URL
});


const feedQueue = new Queue('feed-queue', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
});

// Endpoint to list feeds
const DEFAULT_USER_EMAIL = 'demo@localhost';

server.get('/ping', async (request, reply) => {
    return { pong: 'it works!' };
});

// Helper to get default user
async function getDefaultUser() {
    return prisma.user.upsert({
        where: { email: DEFAULT_USER_EMAIL },
        update: {},
        create: { email: DEFAULT_USER_EMAIL }
    });
}

// Endpoint to list feeds
server.get('/feeds', async (request, reply) => {
    const user = await getDefaultUser();
    const feeds = await prisma.feed.findMany({
        where: {
            subscriptions: {
                some: { userId: user.id }
            }
        },
        orderBy: { title: 'asc' }
    });
    return feeds;
});

// Endpoint to add a feed
server.post<{ Body: { url: string } }>('/feeds', async (request, reply) => {
    const { url } = request.body;

    if (!url) {
        return reply.status(400).send({ error: 'URL is required' });
    }

    let feedUrl = url;

    // Helper to convert YouTube URLs to RSS
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);

            // 1. Try simple URL patterns first
            if (urlObj.pathname.startsWith('/channel/')) {
                const channelId = urlObj.pathname.split('/')[2];
                if (channelId) feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            }
            else if (urlObj.pathname.startsWith('/user/')) {
                const username = urlObj.pathname.split('/')[2];
                if (username) feedUrl = `https://www.youtube.com/feeds/videos.xml?user=${username}`;
            }
            else if (urlObj.pathname.startsWith('/playlist')) {
                const playlistId = urlObj.searchParams.get('list');
                if (playlistId) feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
            }

            // 2. If it is a @handle or custom URL, fetch the page to find the RSS link
            if (feedUrl === url && (url.includes('/@') || !feedUrl.includes('feeds/videos.xml'))) {
                try {
                    // Clean URL to ensure we hit the main channel page (e.g. strip /videos, /featured)
                    let scrapeUrl = url;
                    if (scrapeUrl.includes('/@')) {
                        const parts = scrapeUrl.split('/@');
                        const handle = parts[1].split('/')[0]; // simple split to get just the handle
                        scrapeUrl = `${parts[0]}/@${handle}`;
                    }

                    console.log(`Fetching YouTube page to find RSS: ${scrapeUrl}`);
                    const res = await fetch(scrapeUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                        }
                    });
                    const html = await res.text();
                    // Look for <link rel="alternate" type="application/rss+xml" title="RSS" href="..." />
                    const match = html.match(/title="RSS" href="([^"]+)"/);
                    if (match && match[1]) {
                        feedUrl = match[1];
                        console.log(`Found YouTube RSS: ${feedUrl}`);
                    }
                } catch (err) {
                    console.error('Failed to scrape YouTube page:', err);
                }
            }

        } catch (e) {
            // Ignore invalid URLs, fallback to original
        }
    }

    try {
        const user = await getDefaultUser();
        const feed = await prisma.feed.upsert({
            where: { url: feedUrl },
            update: {},
            create: { url: feedUrl }
        });

        // Auto-subscribe the user
        await prisma.subscription.upsert({
            where: {
                userId_feedId: {
                    userId: user.id,
                    feedId: feed.id
                }
            },
            create: {
                userId: user.id,
                feedId: feed.id
            },
            update: {}
        });

        // Trigger initial crawl
        await feedQueue.add('crawl', { feedId: feed.id, url: feed.url });

        return { success: true, feed };
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Failed to add feed' });
    }
});

// Endpoint to delete a feed
server.delete<{ Params: { id: string } }>('/feeds/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        await prisma.feed.delete({
            where: { id }
        });
        return { success: true };
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Failed to delete feed' });
    }
});

// Endpoint to get stream
server.get<{ Querystring: { feedId?: string, categoryId?: string, type?: 'saved' | 'history' | 'all', limit?: number, search?: string } }>('/stream', async (request, reply) => {
    const { feedId, categoryId, type, limit } = request.query;
    const user = await getDefaultUser();

    const whereClause: any = {};

    if (feedId) {
        whereClause.feedId = feedId;
    }

    if (categoryId) {
        whereClause.feed = {
            subscriptions: {
                some: {
                    userId: user.id,
                    categoryId: categoryId
                }
            }
        };
    }

    if (type === 'saved') {
        whereClause.userArticles = {
            some: {
                userId: user.id,
                isSaved: true
            }
        };
    } else if (type === 'history') {
        whereClause.userArticles = {
            some: {
                userId: user.id,
                isRead: true
            }
        };
    }

    if (request.query.search) {
        const search = request.query.search;
        whereClause.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { summary: { contains: search, mode: 'insensitive' } },
            { aiSummary: { contains: search, mode: 'insensitive' } }
        ];
    }

    const articles = await prisma.article.findMany({
        take: Number(limit) || 50,
        where: whereClause,
        orderBy: { pubDate: 'desc' },
        include: {
            feed: true,
            userArticles: {
                where: { userId: user.id }
            }
        }
    });

    return articles.map(article => ({
        ...article,
        isRead: article.userArticles?.[0]?.isRead ?? false,
        isSaved: article.userArticles?.[0]?.isSaved ?? false,
        userArticles: undefined
    }));
});

// Endpoint to mark article as saved (Read Later)
server.post<{ Params: { id: string }, Body: { saved: boolean } }>('/articles/:id/save', async (request, reply) => {
    const { id } = request.params;
    const { saved } = request.body;
    const user = await getDefaultUser();

    try {
        await prisma.userArticle.upsert({
            where: {
                userId_articleId: {
                    userId: user.id,
                    articleId: id
                }
            },
            create: {
                userId: user.id,
                articleId: id,
                isSaved: saved
            },
            update: {
                isSaved: saved
            }
        });
        return { success: true };
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Failed to update saved status' });
    }
});

// --- Categories API ---

server.get('/categories', async (request, reply) => {
    const user = await getDefaultUser();
    const categories = await prisma.category.findMany({
        where: { userId: user.id },
        include: {
            subscriptions: {
                include: { feed: true }
            }
        },
        orderBy: { name: 'asc' }
    });
    return categories;
});

server.post<{ Body: { name: string } }>('/categories', async (request, reply) => {
    const { name } = request.body;
    const user = await getDefaultUser();

    const category = await prisma.category.create({
        data: {
            name,
            userId: user.id
        }
    });
    return category;
});

server.delete<{ Params: { id: string } }>('/categories/:id', async (request, reply) => {
    const { id } = request.params;
    const user = await getDefaultUser();

    // Check ownership
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || category.userId !== user.id) {
        return reply.status(403).send({ error: 'Unauthorized' });
    }

    // Reset subscriptions (move to uncategorized) - implicitly handled by onDelete: SetNull if we had it, but actually schema says nothing.
    // Actually schema relation on Subscription is optional category.
    // If we delete category, we should set subscription.categoryId to null.

    // First update subscriptions
    await prisma.subscription.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
    });

    await prisma.category.delete({ where: { id } });
    return { success: true };
});

// Move feed to category (Update Subscription)
server.put<{ Params: { feedId: string }, Body: { categoryId: string | null } }>('/feeds/:feedId/category', async (request, reply) => {
    const { feedId } = request.params;
    const { categoryId } = request.body;
    const user = await getDefaultUser();

    try {
        await prisma.subscription.update({
            where: {
                userId_feedId: {
                    userId: user.id,
                    feedId: feedId
                }
            },
            data: {
                categoryId: categoryId
            }
        });
        return { success: true };
    } catch (e) {
        request.log.error(e);
        return reply.status(500).send({ error: 'Failed to move feed' });
    }
});


// Endpoint to mark article as read
server.post<{ Params: { id: string }, Body: { read: boolean } }>('/articles/:id/read', async (request, reply) => {
    const { id } = request.params;
    const { read } = request.body;
    const user = await getDefaultUser();

    try {
        await prisma.userArticle.upsert({
            where: {
                userId_articleId: {
                    userId: user.id,
                    articleId: id
                }
            },
            create: {
                userId: user.id,
                articleId: id,
                isRead: read
            },
            update: {
                isRead: read
            }
        });
        return { success: true };
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Failed to update read status' });
    }
});

// --- Boards API ---

// List boards
server.get('/boards', async (request, reply) => {
    const user = await getDefaultUser();
    const boards = await prisma.board.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } }
    });
    return boards;
});

// Create board
server.post<{ Body: { name: string, description?: string } }>('/boards', async (request, reply) => {
    const { name, description } = request.body;
    const user = await getDefaultUser();

    if (!name) {
        return reply.status(400).send({ error: 'Name is required' });
    }

    const board = await prisma.board.create({
        data: {
            name,
            description,
            userId: user.id
        }
    });
    return board;
});

// Get board details and articles
server.get<{ Params: { id: string } }>('/boards/:id', async (request, reply) => {
    const { id } = request.params;
    const user = await getDefaultUser(); // Ensure user exists

    const board = await prisma.board.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    article: {
                        include: {
                            feed: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!board) {
        return reply.status(404).send({ error: 'Board not found' });
    }

    return board;
});

// Add article to board
server.post<{ Params: { id: string }, Body: { articleId: string } }>('/boards/:id/articles', async (request, reply) => {
    const { id } = request.params;
    const { articleId } = request.body;

    try {
        await prisma.boardItem.create({
            data: {
                boardId: id,
                articleId: articleId
            }
        });
        return { success: true };
    } catch (e) {
        // Ignore UNIQUE constraint failed (already in board)
        return { success: true };
    }
});


// --- Market Intelligence API ---

// Get Trends (Entities)
server.get('/market-intelligence/trends', async (request, reply) => {
    // Check if we have any entities, if not, seed some for demo
    const count = await prisma.entity.count();
    if (count === 0) {
        await seedTrends();
    }

    const trends = await prisma.entity.findMany({
        orderBy: { growth: 'asc' }, // Mock ordering
        include: {
            metrics: {
                orderBy: { date: 'asc' },
                take: 20
            },
            _count: { select: { articles: true } }
        }
    });
    return trends;
});

// Get Entity Details
server.get<{ Params: { id: string } }>('/market-intelligence/entity/:id', async (request, reply) => {
    const { id } = request.params;
    const entity = await prisma.entity.findUnique({
        where: { id },
        include: {
            metrics: { orderBy: { date: 'asc' } },
            articles: {
                take: 5,
                orderBy: { pubDate: 'desc' },
                include: { feed: true }
            }
        }
    });

    if (!entity) return reply.status(404).send({ error: 'Entity not found' });
    return entity;
});

// Ask AI (Mock)
server.post<{ Body: { query: string, context?: any } }>('/ai/ask', async (request, reply) => {
    const { query } = request.body;
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
        answer: `Based on the analysis of recent articles, **${query}** is showing significant traction. Key drivers include increased adoption in enterprise sectors and new regulatory frameworks. \n\n*Reference: TechCrunch, Reuters*`
    };
});

async function seedTrends() {
    const trends = [
        { name: 'Generative AI', type: 'TECHNOLOGY', growth: 'EXPLODING', size: 'MAINSTREAM' },
        { name: 'Nvidia', type: 'COMPANY', growth: 'SURGING', size: 'MAINSTREAM' },
        { name: 'Quantum Computing', type: 'TECHNOLOGY', growth: 'GROWING', size: 'KNOWN' },
        { name: 'Sustainable Aviation', type: 'TREND', growth: 'STABLE', size: 'NICHE' },
        { name: 'OpenAI', type: 'COMPANY', growth: 'SURGING', size: 'MAINSTREAM' },
    ];

    for (const t of trends) {
        const entity = await prisma.entity.create({
            data: {
                name: t.name,
                type: t.type as any,
                growth: t.growth as any,
                size: t.size as any,
                description: `Auto-generated description for ${t.name}`
            }
        });

        // Add dummy metrics
        const now = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            await prisma.entityMetric.create({
                data: {
                    entityId: entity.id,
                    date: date,
                    count: Math.floor(Math.random() * 50) + 10,
                    sentiment: (Math.random() * 2) - 1
                }
            });
        }
    }
}

// --- Save Article from URL ---
server.post<{ Body: { url: string } }>('/articles/save', async (request, reply) => {
    const { url } = request.body;
    const user = await getDefaultUser();

    if (!url) {
        return reply.status(400).send({ error: 'URL is required' });
    }

    try {
        // 1. Get or Create "Internal Saved" Feed bucket
        const savedFeed = await prisma.feed.upsert({
            where: { url: 'internal://saved' },
            create: {
                url: 'internal://saved',
                title: 'Saved Articles',
                description: 'Articles manually saved from the web',
                siteUrl: 'https://feedly.com' // Placeholder
            },
            update: {}
        });

        // 2. Check if article already exists in this bucket
        let article = await prisma.article.findUnique({
            where: {
                feedId_guid: {
                    feedId: savedFeed.id,
                    guid: url
                }
            }
        });

        // 3. If not, scrape and create
        if (!article) {
            console.log(`Scraping content for manual save: ${url}`);
            try {
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FeedlyAI/1.0;)' }
                });

                if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);

                const html = await res.text();
                const doc = new JSDOM(html, { url });
                const reader = new Readability(doc.window.document);
                const parsed = reader.parse();

                article = await prisma.article.create({
                    data: {
                        title: parsed?.title || 'Untitled Article',
                        content: parsed?.content || '',
                        summary: parsed?.excerpt || '',
                        link: url,
                        guid: url,
                        feedId: savedFeed.id,
                        pubDate: new Date(), // Set as now
                        imageUrl: null
                    }
                });
            } catch (err) {
                request.log.error(err);
                return reply.status(500).send({ error: 'Failed to scrape article content' });
            }
        }

        // 4. Link to User as "Saved"
        await prisma.userArticle.upsert({
            where: {
                userId_articleId: {
                    userId: user.id,
                    articleId: article.id
                }
            },
            create: {
                userId: user.id,
                articleId: article.id,
                isSaved: true,
                isRead: false
            },
            update: {
                isSaved: true
            }
        });

        return { success: true, article };

    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});

const start = async () => {
    try {
        // Ensure DB connection
        await prisma.$connect();

        await server.listen({ port: 4000, host: '0.0.0.0' });
        console.log('Server started on http://localhost:4000');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
