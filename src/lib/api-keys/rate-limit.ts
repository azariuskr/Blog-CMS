import { getRedisClient } from "@/lib/cache/redis";
import { Err, Ok, type Result } from "@/lib/result";

interface RateLimitInfo {
	remaining: number;
	limit: number;
	reset: number; // epoch seconds
}

export async function checkRateLimit(
	keyId: string,
	rpm: number,
): Promise<Result<RateLimitInfo>> {
	try {
		const client = await getRedisClient();
		const redisKey = `ratelimit:apikey:${keyId}`;
		const count = await client.incr(redisKey);

		if (count === 1) {
			await client.expire(redisKey, 60);
		}

		const ttl = await client.ttl(redisKey);
		const reset = Math.ceil(Date.now() / 1000) + Math.max(ttl, 0);

		if (count > rpm) {
			return Err(
				{ status: 429, message: "Rate limit exceeded" },
				`Rate limit exceeded: ${count}/${rpm} requests per minute`,
			);
		}

		return Ok({ remaining: rpm - count, limit: rpm, reset });
	} catch (error) {
		// Fail open — allow request through if Redis is down
		console.warn("[api-keys] Redis rate limit check failed, allowing request:", error);
		return Ok({ remaining: rpm, limit: rpm, reset: Math.ceil(Date.now() / 1000) + 60 });
	}
}

export function rateLimitHeaders(info: RateLimitInfo): Record<string, string> {
	return {
		"X-RateLimit-Limit": String(info.limit),
		"X-RateLimit-Remaining": String(Math.max(0, info.remaining)),
		"X-RateLimit-Reset": String(info.reset),
	};
}
