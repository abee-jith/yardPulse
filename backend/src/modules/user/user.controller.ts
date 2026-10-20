import { Request, Response } from "express";
import { login, profile } from "./user.service";

export function getDeviceName(userAgent?: string): string {
  return !userAgent
    ? "Unknown"
    : /mobile|android|iphone|ipod/i.test(userAgent)
      ? "Mobile"
      : "Pc";
}

export async function loginController(req: Request, res: Response) {
  const userAgent = req.headers["user-agent"];
  const result = await login({
    input: req.body,
    metadata: {
      deviceName: getDeviceName(userAgent),
      userAgent: userAgent ?? "unknown",
      ipAddress: req.ip ?? "unknown",
    },
  });

  return res.status(result.status).json(result);
}

export async function profileController(req: Request, res: Response) {
  const result = await profile({
    user: req.user!,
  });

  return res.status(result.status).json(result);
}
