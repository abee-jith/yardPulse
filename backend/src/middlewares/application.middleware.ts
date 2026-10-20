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
    origin: env.nodeEnv === "development" ? "*" : env.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "lang",
      "x-custom-header",
    ],
  }),

  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),

  express.json({
    limit: "1mb",
  }),

  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
];
