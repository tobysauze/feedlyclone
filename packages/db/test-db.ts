import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://user:password@127.0.0.1:5432/feedly_clone"
        }
    }
});

async function main() {
    try {
        console.log('Connecting...');
        await prisma.$connect();
        console.log('Connected successfully!');
        const count = await prisma.feed.count();
        console.log('Feed count:', count);
    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
