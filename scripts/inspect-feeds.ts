
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const urlsToCheck = [
        'https://singularityhub.com/feed/',
        'https://futurism.com/feed',
        'https://mkaku.org/home/feed/'
    ];

    const feeds = await prisma.feed.findMany({
        where: {
            OR: urlsToCheck.map(url => ({ url: { contains: url } }))
        },
        include: {
            _count: {
                select: { articles: true }
            }
        }
    });

    console.log('--- Feed Inspection ---');
    for (const feed of feeds) {
        console.log(`\nFeed: ${feed.title || feed.url}`);
        console.log(`ID: ${feed.id}`);
        console.log(`URL: ${feed.url}`);
        console.log(`Last Crawled: ${feed.lastCrawledAt}`);
        console.log(`Next Crawl: ${feed.nextCrawlAt}`);
        console.log(`Error Count: ${feed.errorCount}`);
        console.log(`Article Count: ${feed._count.articles}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
