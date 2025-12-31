
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_USER_EMAIL = 'demo@localhost';

async function main() {
    const user = await prisma.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } });
    if (!user) {
        console.log("User not found");
        return;
    }

    const feeds = await prisma.feed.findMany();
    console.log(`Total Feeds in DB: ${feeds.length}`);

    const subscriptions = await prisma.subscription.findMany({
        where: { userId: user.id },
        include: { feed: true }
    });
    console.log(`Total Subscriptions for user: ${subscriptions.length}`);

    for (const feed of feeds) {
        const sub = subscriptions.find(s => s.feedId === feed.id);
        console.log(`Feed: ${feed.title || feed.url} (ID: ${feed.id})`);
        console.log(`- Subscribed: ${sub ? 'YES' : 'NO'}`);
        if (sub) console.log(`- Category: ${sub.categoryId || 'None'}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
