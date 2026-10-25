import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const middlewares = [
  compression(),
  helmet(),

  cors({
    origin: env.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "lang",
      "x-custom-header",
    ],
  }),

  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) =>
      res
        .status(429)
        .set("Content-Type", "application/problem+json")
        .json({
          type: "https://yardpulse.test/problems/rate-limited",
          title: "Too many requests",
          status: 429,
          code: "rate_limited",
          detail: "Too many requests. Please try again later.",
        }),
  }),

  express.json({
    limit: "1mb",
  }),

  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
];
