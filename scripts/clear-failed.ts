
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const queue = new Queue('feed-queue', { connection });

async function main() {
    const counts = await queue.getJobCounts();
    console.log('Current Counts:', counts);

    if (counts.failed > 0) {
        console.log(`Cleaning ${counts.failed} failed jobs...`);
        await queue.clean(0, 5000, 'failed'); // Clean all failed jobs
        console.log('Failed jobs cleared.');
    }

    // Also log completed count to see if we have ANY success
    console.log('Completed jobs:', counts.completed);
}

main()
    .catch(console.error)
    .finally(async () => {
        await queue.close();
        process.exit(0);
    });
