
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const { count } = await prisma.feed.deleteMany({
        where: {
            url: { contains: 'youtube.com/@hubermanlab/featured' }
        }
    });
    console.log(`Deleted ${count} broken feeds.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
