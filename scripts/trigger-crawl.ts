
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
    const feedId = '3acc4bad-a9ff-41fe-9cff-fdfa1be1b12a'; // TechCrunch
    const feed = await prisma.feed.findUnique({
        where: { id: feedId }
    });

    if (feed) {
        console.log(`Triggering crawl for ${feed.title} (${feed.id})`);
        await feedQueue.add('crawl', { feedId: feed.id, url: feed.url });
        console.log('Job added.');
    } else {
        console.log('Feed not found.');
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await feedQueue.close();
    });
