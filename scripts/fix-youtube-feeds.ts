
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';
import axios from 'axios';

// Load env from root or apps/api
dotenv.config({ path: 'apps/api/.env' });

const prisma = new PrismaClient();

const feedQueue = new Queue('feed-queue', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
});

async function main() {
    const feeds = await prisma.feed.findMany({
        where: {
            url: { contains: 'youtube.com' },
            NOT: { url: { contains: 'feeds/videos.xml' } }
        }
    });

    console.log(`Found ${feeds.length} broken YouTube feeds.`);

    for (const feed of feeds) {
        let url = feed.url;
        console.log(`Fixing: ${url}`);

        let scrapeUrl = url;
        if (scrapeUrl.includes('/@')) {
            const parts = scrapeUrl.split('/@');
            const handle = parts[1].split('/')[0];
            scrapeUrl = `${parts[0]}/@${handle}`;
        }

        try {
            // Using axios here as we know it works in scripts from previous test
            const res = await axios.get(scrapeUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                }
            });
            const html = res.data;
            const match = html.match(/title="RSS" href="([^"]+)"/);

            if (match && match[1]) {
                const rssUrl = match[1];
                console.log(`-> Found RSS: ${rssUrl}`);

                // Update DB
                await prisma.feed.update({
                    where: { id: feed.id },
                    data: {
                        url: rssUrl,
                        errorCount: 0
                    }
                });

                // Trigger Crawl
                await feedQueue.add('crawl', { feedId: feed.id, url: rssUrl });
                console.log('-> Crawl scheduled');
            } else {
                console.log('-> No RSS link found');
            }

        } catch (e) {
            console.error(`-> Failed to scrape: ${e.message}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await feedQueue.close();
    });
