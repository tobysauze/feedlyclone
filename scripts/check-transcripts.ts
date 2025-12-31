
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Andrew Huberman Feed ID
    // We can also just search for any article with youtube link and content containing "Transcript"

    const articles = await prisma.article.findMany({
        where: {
            link: { contains: 'youtube.com' },
            content: { contains: 'Video Transcript' }
        },
        take: 3,
        orderBy: { pubDate: 'desc' }
    });

    if (articles.length > 0) {
        console.log(`FOUND ${articles.length} articles with transcripts!`);
        articles.forEach(a => {
            console.log(`- ${a.title}`);
            console.log(`  Snippet: ${a.content?.substring(0, 100)}...`);
        });
    } else {
        console.log('No articles with transcripts found yet. Worker might be processing or transcripts disabled.');

        // Check raw content of a recent youtube article
        const recentYt = await prisma.article.findFirst({
            where: { link: { contains: 'youtube.com' } },
            orderBy: { pubDate: 'desc' }
        });
        if (recentYt) {
            console.log('Most recent YouTube article updated at:', recentYt.updatedAt);
            console.log('Title:', recentYt.title);
            console.log('Content Start:', recentYt.content?.substring(0, 200));
        }
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
