
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const queue = new Queue('feed-queue', { connection });

async function main() {
    console.log('Clearing ALL jobs from queue...');
    await queue.drain();
    await queue.clean(0, 10000, 'active');
    await queue.clean(0, 10000, 'wait');
    await queue.clean(0, 10000, 'failed');
    await queue.clean(0, 10000, 'delayed');

    // Nuke it from orbit
    await queue.obliterate({ force: true });

    console.log('Queue obliterated. State is clean.');
}

main()
    .catch(console.error)
    .finally(() => queue.close());
