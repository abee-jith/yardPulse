import "dotenv/config";

import { AppDataSource } from "../src/config/database";
import { seedUsers } from "./user.seeder";

async function seed() {
  try {
    await AppDataSource.initialize();
    await seedUsers(AppDataSource);
    console.log("All seeds completed successfully");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

seed();
