
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' }); // Try to load env

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

console.log('Testing Redis connection to:', connection);

const queue = new Queue('test-connection-queue', { connection });

async function test() {
    try {
        console.log('Attempting to connect...');
        const client = await queue.client;
        await client.ping();
        console.log('Redis PING successful!');
        await queue.close();
        process.exit(0);
    } catch (e) {
        console.error('Redis connection failed:', e);
        process.exit(1);
    }
}

test();
