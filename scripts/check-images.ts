
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const articles = await prisma.article.findMany({
        take: 10,
        orderBy: { pubDate: 'desc' },
        select: {
            id: true,
            title: true,
            imageUrl: true,
            link: true,
            feed: {
                select: {
                    title: true
                }
            }
        }
    });

    console.log('Recent Articles Check:');
    articles.forEach(a => {
        console.log(`[${a.feed?.title}] ${a.title}`);
        console.log(`   Image: ${a.imageUrl || 'NULL'}`);
        console.log(`   Link: ${a.link}`);
        console.log('---');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
