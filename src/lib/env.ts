import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("3000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required").default("mongodb://localhost:27017/figuresworld"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(16).default("super-secret-jwt-key-figures-world-dev-secret-12345"),
});

const parseEnv = () => {
  const result = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  });

  if (!result.success) {
    console.error("Invalid environment variables:", result.error.format());
    // In dev, fallback gracefully if possible; in production throw
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment configuration.");
    }
  }

  return result.success
    ? result.data
    : {
        NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
        PORT: process.env.PORT || "3000",
        MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/figuresworld",
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        JWT_SECRET: process.env.JWT_SECRET || "super-secret-jwt-key-figures-world-dev-secret-12345",
      };
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
