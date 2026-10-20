import express from "express";
import { middlewares } from "./middlewares/application.middleware";
import routes from "./routes";

const app = express();

app.use(middlewares);
app.use("/api", routes);
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
