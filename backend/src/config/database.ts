import "dotenv/config";
import { DataSource } from "typeorm";
import { env } from "./env";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.database,
  schema: env.db.schema,
  entities: [env.nodeEnv === "production" ? "dist/**/*.entity.js" : "src/**/*.entity.ts"],
  migrations: [
    env.nodeEnv === "production"
      ? "dist/migrations/*.js"
      : "src/migrations/*.ts",
  ],
  migrationsRun: false,
  synchronize: false,
  logging: false,
});

export async function initializeDatabase(): Promise<void> {
  await AppDataSource.initialize();
  const schema = env.db.schema.replace(/"/g, '""');
  await AppDataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await AppDataSource.runMigrations();
}
