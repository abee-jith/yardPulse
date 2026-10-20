import { Request, Response } from "express";
import { findContainerData, listContainers } from "./container.service";
import { findContainerSchema, listContainersSchema } from "./container.schema";

export async function listContainersController(req: Request, res: Response) {
  const query = listContainersSchema.parse(req.query);
  const result = await listContainers({
    input: query,
    user: req.user!,
  });
  return res.status(result.status).json(result);
}

export async function findContainerController(req: Request, res: Response) {
  const params = findContainerSchema.parse(req.params);
  const result = await findContainerData({
    params,
    user: req.user!,
  });
  return res.status(result.status).json(result);
}
