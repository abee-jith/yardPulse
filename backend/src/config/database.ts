import "dotenv/config";
import { DataSource } from "typeorm";
import { env } from "./env";

const isProduction = env.nodeEnv === "production";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.database,
  schema: env.db.schema,
  entities: [isProduction ? "dist/**/*.entity.js" : "src/**/*.entity.ts"],
  synchronize: !isProduction,
  logging: false,
});
