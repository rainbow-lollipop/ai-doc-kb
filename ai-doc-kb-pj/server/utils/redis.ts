import Redis from "ioredis";

let client: Redis | null = null;

export function useRedis(): Redis {
	if (!client) client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
	return client;
}
