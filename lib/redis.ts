
import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is missing from .env.local");
}

const globalForRedis = globalThis as unknown as {
  redisClient?: ReturnType<typeof createClient>;
  redisConnectPromise?: Promise<ReturnType<typeof createClient>>;
};

export const redisClient =
  globalForRedis.redisClient ??
  createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) =>
        Math.min(retries * 500, 3000),
    },
  });

if (!globalForRedis.redisClient) {
  globalForRedis.redisClient = redisClient;
}

redisClient.on("error", (error) => {
  console.error("Redis client error:", error);
});

export async function connectRedis() {
  if (redisClient.isReady) {
    return redisClient;
  }

  if (!globalForRedis.redisConnectPromise) {
    const connection = redisClient.connect();

    globalForRedis.redisConnectPromise = connection;

    try {
      await connection;
    } finally {
      if (globalForRedis.redisConnectPromise === connection) {
        globalForRedis.redisConnectPromise = undefined;
      }
    }
  } else {
    await globalForRedis.redisConnectPromise;
  }

  return redisClient;
}
