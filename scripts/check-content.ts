
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const feedId = '3acc4bad-a9ff-41fe-9cff-fdfa1be1b12a'; // TechCrunch
    const articles = await prisma.article.findMany({
        where: { feedId: feedId },
        orderBy: { pubDate: 'desc' },
        take: 1
    });

    if (articles.length > 0) {
        const article = articles[0];
        console.log(`Title: ${article.title}`);
        console.log(`Content Length: ${article.content?.length}`);
        console.log(`Content Snippet (first 500 chars):`);
        console.log(article.content?.substring(0, 500));

        // Check if it looks like full content (has paragraphs, divs, etc)
        if (article.content?.includes('<div') || article.content?.includes('<p>')) {
            console.log('VERIFICATION: Content contains HTML tags, likely successful scrape.');
        } else {
            console.log('VERIFICATION: Content might be plain text or brief snippet.');
        }
    } else {
        console.log('No articles found.');
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
