
import { Queue } from 'bullmq';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: 'apps/api/.env' });

const prisma = new PrismaClient();
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const queue = new Queue('feed-queue', { connection });

async function main() {
    const urlsToTrigger = [
        'https://singularityhub.com/feed/',
        'https://futurism.com/feed',
        'https://mkaku.org/home/feed/'
    ];

    const feeds = await prisma.feed.findMany({
        where: {
            OR: urlsToTrigger.map(url => ({ url: { contains: url } }))
        }
    });

    console.log(`Found ${feeds.length} feeds to trigger.`);

    for (const feed of feeds) {
        console.log(`Triggering crawl for: ${feed.title} (${feed.url})`);
        await queue.add('crawl-feed', { feedId: feed.id }, {
            prioritize: true, // Jump to front of queue? BullMQ doesn't have a direct "jump to front" but priority helps if configured. 
            // Actually standard BullMQ uses 'priority' option. Lower number = higher priority? No, BullMQ priority: 1 is higher than no priority.
            // Let's just add it.
        });
    }

    console.log('Triggered.');
}

main()
    .catch(console.error)
    .finally(async () => {
        await queue.close();
        await prisma.$disconnect();
    });
