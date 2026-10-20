import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        status: 401,
        message: "Unauthenticated request",
        data: null,
      });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        status: 401,
        message: "Invalid authorization header",
        data: null,
      });
    }

    const payload = jwt.verify(
      token,
      env.jwt.secret,
    ) as unknown as AccessTokenPayload;

    req.user = {
      id: Number(payload.id),
      fullName: payload.fullName,
      role: payload.role,
      lineCode: payload.lineCode,
    };

    next();
  } catch {
    return res.status(401).json({
      status: 401,
      message: "Invalid or expired access token",
      data: null,
    });
  }
}
