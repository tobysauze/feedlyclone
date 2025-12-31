
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Recent Feeds ---');
    const feeds = await prisma.feed.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    for (const feed of feeds) {
        console.log(`ID: ${feed.id}`);
        console.log(`Title: ${feed.title}`);
        console.log(`URL: ${feed.url}`);
        console.log(`Last Crawled: ${feed.lastCrawledAt}`);
        console.log(`Error Count: ${feed.errorCount}`);

        const articleCount = await prisma.article.count({
            where: { feedId: feed.id }
        });
        console.log(`Article Count: ${articleCount}`);
        console.log('-------------------');
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
