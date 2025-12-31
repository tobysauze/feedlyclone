
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking YouTube Articles for Images ---');
    // Find articles from the Huberman feed (we know it's there from previous steps)
    const articles = await prisma.article.findMany({
        where: {
            // simpler to just check recent ones with youtube links
            link: { contains: 'youtube.com' }
        },
        orderBy: { pubDate: 'desc' },
        take: 5
    });

    if (articles.length === 0) {
        console.log("No YouTube articles found.");
    }

    for (const article of articles) {
        console.log(`Title: ${article.title}`);
        console.log(`Link: ${article.link}`);
        console.log(`Image URL: ${article.imageUrl || 'MISSING'}`);
        console.log('-------------------');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
