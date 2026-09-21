import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";
import { MemoryModel } from "./memory-store";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  mode: "mongodb" | "memory";
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null, mode: "mongodb" };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 2000,
    };

    logger.info("Connecting to MongoDB...", { uri: env.MONGODB_URI.replace(/\/\/.*@/, "//@***:") });

    cached!.promise = mongoose.connect(env.MONGODB_URI, opts).then((mongooseInstance) => {
      logger.info("MongoDB connected successfully");
      cached!.mode = "mongodb";
      return mongooseInstance;
    }).catch((err) => {
      logger.warn("MongoDB connection unavailable. Activating In-Memory Datastore fallback for local development.", {
        reason: err.message,
      });
      cached!.mode = "memory";
      // Return mongoose without connection so memory proxy is used
      return mongoose;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.mode = "memory";
    cached!.conn = mongoose;
  }

  return cached!.conn;
}

export function getModelProxy<T>(mongooseModel: T, collectionName: string): T {
  const memoryFallback = new MemoryModel(collectionName);

  return new Proxy(mongooseModel as object, {
    get(target, prop) {
      if (mongoose.connection.readyState === 1) {
        return (target as Record<string, unknown>)[prop as string];
      }
      if (prop in memoryFallback) {
        return (memoryFallback as unknown as Record<string, unknown>)[prop as string];
      }
      return (target as Record<string, unknown>)[prop as string];
    },
  }) as T;
}

export async function disconnectDatabase(): Promise<void> {
  if (cached?.conn && mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    logger.info("MongoDB disconnected");
  }
}
