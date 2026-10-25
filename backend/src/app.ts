import express from "express";
import { middlewares } from "./middlewares/application.middleware";
import routes from "./routes";
import { AppDataSource } from "./config/database";
import { sendProblem } from "./utils/problem";
import { env } from "./config/env";

const app = express();

app.use(middlewares);
app.use("/api", routes);
app.get("/api/v1/health", async (_req, res) => {
  try {
    await AppDataSource.query("SELECT 1");
    return res.status(200).json({
      status: 200,
      message: "Server and database are healthy.",
      data: { server: "YardPulse", health: "Good", version: "1.0.0" },
    });
  } catch {
    return sendProblem(res, {
      type: "https://yardpulse.test/problems/internal-error",
      title: "Health check failed",
      status: 503,
      code: "internal_error",
      detail: "The database is unavailable.",
    });
  }
});

app.use("/api", (_req, res) =>
  sendProblem(res, {
    type: "https://yardpulse.test/problems/not-found",
    title: "Not found",
    status: 404,
    code: "not_found",
    detail: "The requested API resource does not exist.",
  }),
);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (env.nodeEnv === "development") console.error("API request failed:", error);
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error.status === 400 || error.status === 413)
        ? error.status
        : 500;

    return sendProblem(
      res,
      status === 400
        ? {
            type: "https://yardpulse.test/problems/validation-failed",
            title: "Invalid request",
            status: 400,
            code: "validation_failed",
            detail: "The request body could not be parsed.",
          }
        : status === 413
          ? {
              type: "https://yardpulse.test/problems/request-too-large",
              title: "Request too large",
              status: 413,
              code: "request_too_large",
              detail: "The request exceeds the maximum allowed size.",
            }
          : {
              type: "https://yardpulse.test/problems/internal-error",
              title: "Internal server error",
              status: 500,
              code: "internal_error",
              detail: "An unexpected error occurred. Please try again later.",
            },
    );
  },
);

export default app;
