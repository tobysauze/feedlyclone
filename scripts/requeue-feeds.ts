
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const prisma = new PrismaClient();
const feedQueue = new Queue('feed-queue', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
});

async function main() {
    const feeds = await prisma.feed.findMany();
    console.log(`Found ${feeds.length} feeds. Re-queuing...`);

    for (const feed of feeds) {
        await feedQueue.add('crawl', { feedId: feed.id, url: feed.url });
        console.log(`Queued: ${feed.title || feed.url}`);
    }

    console.log('All feeds queued.');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await feedQueue.close();
    });
