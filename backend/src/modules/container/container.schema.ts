import { z } from "zod";
import { CONTAINER_STATUS } from "../../common/enum";

export const listContainersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(CONTAINER_STATUS).optional(),
  has_active_hold: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.coerce.number().int().optional(),
});

export const findContainerSchema = z.object({
  containerNumber: z.string().trim().max(100),
});

export type ListContainersQuery = z.infer<typeof listContainersSchema>;
export type FindContainerQuery = z.infer<typeof findContainerSchema>;
