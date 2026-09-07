import { createClient } from 'redis';
import config from '../config';

export const RedisClient = createClient({
    username: config.REDIS_USERNAME,
    password: config.REDIS_PASSWORD,
    socket: {
        host: config.REDIS_HOST,
        port: Number(config.REDIS_PORT)
    }
});



