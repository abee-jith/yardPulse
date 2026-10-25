import "dotenv/config";
import "reflect-metadata";

import app from "./app";
import { env } from "./config/env";
import { initializeDatabase } from "./config/database";

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Server connection failed:", error);
    process.exit(1);
  }
};

startServer();
