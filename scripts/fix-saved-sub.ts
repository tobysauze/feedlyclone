
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_USER_EMAIL = 'demo@localhost';

async function main() {
    const user = await prisma.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } });
    const feed = await prisma.feed.findUnique({ where: { url: 'internal://saved' } });

    if (user && feed) {
        await prisma.subscription.upsert({
            where: {
                userId_feedId: {
                    userId: user.id,
                    feedId: feed.id
                }
            },
            create: { userId: user.id, feedId: feed.id },
            update: {}
        });
        console.log('Subscribed user to Saved Articles feed.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
