import { Request, Response } from "express";
import { listContainers } from "./container.service";

export async function listContainersController(req: Request, res: Response) {
  const result = await listContainers(req.query as never);
  return res.status(result.status).json(result);
}
