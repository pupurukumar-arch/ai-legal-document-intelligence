/**
 * BullMQ Job Queue Service
 * Manages background asynchronous jobs for embedding generation, legal reasoning,
 * and high-volume contract ingestion.
 */

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redisConnection = null;
let contractQueue = null;
let isRedisAvailable = false;

try {
    redisConnection = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy: (times) => {
            if (times > 2) {
                return null;
            }
            return Math.min(times * 500, 2000);
        }
    });

    redisConnection.on('connect', () => {
        isRedisAvailable = true;
        console.log(`[BullMQ] Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
    });

    redisConnection.on('error', (err) => {
        isRedisAvailable = false;
        // Suppress unhandled crash if Redis is not locally installed
    });

    contractQueue = new Queue('contract-processing-queue', {
        connection: redisConnection
    });
} catch (err) {
    console.warn('[BullMQ] Redis initialization skipped:', err.message);
}

/**
 * Dispatches an asynchronous embedding or enrichment job.
 */
async function addContractJob(jobName, data) {
    if (!contractQueue || !isRedisAvailable) {
        // Fallback to direct synchronous execution or log notice
        return {
            status: 'redis_unavailable_fallback',
            jobId: `local-${Date.now()}`,
            jobName,
            data
        };
    }

    const job = await contractQueue.add(jobName, data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    });

    return {
        status: 'queued',
        jobId: job.id,
        jobName
    };
}

module.exports = {
    contractQueue,
    addContractJob,
    isRedisConnected: () => isRedisAvailable
};
