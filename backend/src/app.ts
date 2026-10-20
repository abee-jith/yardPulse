import express from "express";
import { middlewares } from "./middlewares/application.middleware";

const app = express();

app.use(middlewares);
app.get("/", (_req, res) => {
  res.status(200).json({
    status: 200,
    message: "Server is running successfully",
    data: {
      server: "YardPulse",
      status: "success",
      health: "Good",
      version: "1.0.0",
    },
  });
});

export default app;
