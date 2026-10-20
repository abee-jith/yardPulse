import "dotenv/config";
import { AppDataSource } from "../src/config/database";

import { seedUsers } from "./user.seeder";
import { seedVesselVisits } from "./vessel-visit.seeder";
import { seedContainers } from "./container.seder";
import { seedContainerEvents } from "./constainer-event.seeder";
import { seedHolds } from "./hold.seeder";

async function seed(): Promise<void> {
  try {
    await AppDataSource.initialize();

    await seedUsers(AppDataSource);
    await seedVesselVisits(AppDataSource);
    await seedContainers(AppDataSource);
    await seedHolds(AppDataSource);
    await seedContainerEvents(AppDataSource);

    console.log("All seeds completed successfully.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void seed();
