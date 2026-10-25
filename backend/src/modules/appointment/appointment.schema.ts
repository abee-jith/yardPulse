import { z } from "zod";

export const createAppointmentSchema = z.object({
  container_no: z
    .string()
    .trim()
    .regex(/^[A-Z]{4}\d{7}$/, "Invalid container number"),

  slot_start: z.string().datetime({
    offset: true,
    message: "slot_start must include a timezone",
  }),

  truck_plate: z.string().trim().min(1).max(20),
});

export const idempotencyKeySchema = z.string().uuid();
export const idempotencyKeyHeaderSchema = z.object({
  "Idempotency-Key": idempotencyKeySchema,
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
