import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { sendProblem } from "../utils/problem";

const accessTokenSchema = z.object({
  id: z.number().int().positive(),
  fullName: z.string().min(2).max(100),
  role: z.string(),
  lineCode: z.string().nullable(),
});

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return sendProblem(res, {
      type: "https://yardpulse.test/problems/unauthenticated",
      title: "Authentication required",
      status: 401,
      code: "unauthenticated",
      detail: "A valid bearer token is required.",
    });
  }

  const [scheme, token, ...extraParts] = authorization.split(" ");
  if (scheme !== "Bearer" || !token || extraParts.length > 0) {
    return sendProblem(res, {
      type: "https://yardpulse.test/problems/unauthenticated",
      title: "Authentication required",
      status: 401,
      code: "unauthenticated",
      detail: "The Authorization header must contain a bearer token.",
    });
  }

  try {
    const verified = jwt.verify(token, env.jwt.secret);
    const payload = accessTokenSchema.safeParse(verified);
    if (!payload.success) throw new Error("Invalid token payload");

    req.user = payload.data;
    return next();
  } catch {
    return sendProblem(res, {
      type: "https://yardpulse.test/problems/unauthenticated",
      title: "Authentication required",
      status: 401,
      code: "unauthenticated",
      detail: "The bearer token is invalid or expired.",
    });
  }
}
