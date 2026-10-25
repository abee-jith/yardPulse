import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"], {
    error: "Invalid NODE_ENV",
  }),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
  DB_HOST: z.string().min(1, "DB_HOST is required"),
  DB_PORT: z.coerce.number().int().positive().min(1, "DB_PORT is required"),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_SCHEMA: z.string().min(1, "DB_SCHEMA is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  SLOT_CAPACITY: z.coerce.number().int().min(1).default(20),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    `Invalid environment variables:\n${JSON.stringify(
      z.treeifyError(parsedEnv.error),
      null,
      2,
    )}`,
  );

  process.exit(1);
}

const config = parsedEnv.data;

export const env = {
  nodeEnv: config.NODE_ENV,
  port: config.PORT,
  corsOrigin: config.CORS_ORIGIN,
  db: {
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    schema: config.DB_SCHEMA,
  },
  jwt: {
    secret: config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN,
  },
  slotCapacity: config.SLOT_CAPACITY,
};
