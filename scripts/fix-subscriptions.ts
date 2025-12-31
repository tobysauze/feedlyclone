
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_USER_EMAIL = 'demo@localhost';

async function main() {
    const user = await prisma.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } });
    if (!user) throw new Error("User not found");

    const feeds = await prisma.feed.findMany();
    console.log(`Found ${feeds.length} feeds.`);

    for (const feed of feeds) {
        await prisma.subscription.upsert({
            where: {
                userId_feedId: {
                    userId: user.id,
                    feedId: feed.id
                }
            },
            create: {
                userId: user.id,
                feedId: feed.id
            },
            update: {}
        });
        console.log(`Subscribed to ${feed.title || feed.url}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
