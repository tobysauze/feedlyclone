
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
    console.log('--- Queue Status ---');
    console.log('Waiting:', counts.waiting);
    console.log('Active:', counts.active);
    console.log('Completed:', counts.completed);
    console.log('Failed:', counts.failed);
    console.log('Delayed:', counts.delayed);

    if (counts.failed > 0) {
        const failed = await queue.getFailed(0, 5);
        console.log('\n--- Recent Failed Jobs ---');
        failed.forEach(job => {
            console.log(`ID: ${job.id}, Reason: ${job.failedReason}`);
        });
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await queue.close();
    });
