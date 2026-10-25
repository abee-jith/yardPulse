import { Request, Response } from "express";

import {
  createAppointmentSchema,
  idempotencyKeySchema,
} from "./appointment.schema";
import { createAppointment } from "./appointment.service";
import { sendServiceResponse } from "../../utils/problem";

export async function createAppointmentController(req: Request, res: Response) {
  const input = createAppointmentSchema.parse(req.body);
  const idempotencyKey = idempotencyKeySchema.parse(
    req.header("Idempotency-Key"),
  );

  const result = await createAppointment({
    input,
    idempotencyKey,
    user: req.user!,
  } as any);

  return sendServiceResponse(res, result);
}
