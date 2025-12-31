
import { PrismaClient } from '@prisma/client';
import Parser from 'rss-parser';

const prisma = new PrismaClient();
const parser = new Parser();

async function main() {
    console.log('Checking for feeds with missing titles...');
    const feeds = await prisma.feed.findMany({
        where: {
            title: null
        }
    });

    console.log(`Found ${feeds.length} feeds to update.`);

    for (const feed of feeds) {
        try {
            console.log(`Fetching metadata for ${feed.url}...`);
            const remoteFeed = await parser.parseURL(feed.url);

            if (remoteFeed.title) {
                await prisma.feed.update({
                    where: { id: feed.id },
                    data: {
                        title: remoteFeed.title,
                        description: remoteFeed.description,
                        siteUrl: remoteFeed.link
                    }
                });
                console.log(`✅ Updated: ${remoteFeed.title}`);
            } else {
                console.log(`⚠️ No title found for ${feed.url}`);
            }
        } catch (error) {
            console.error(`❌ Failed to fetch ${feed.url}:`, error);
        }
    }
    console.log('Done!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
