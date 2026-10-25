import { Router } from "express";
import { authenticate } from "../../middlewares/authentication.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { userSchema } from "../user/user.schema";
import {
  createAppointmentSchema,
  idempotencyKeySchema,
} from "./appointment.schema";
import { createAppointmentController } from "./appointment.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(userSchema, "user"),
  validate(createAppointmentSchema, "body"),
  validate(idempotencyKeySchema, "headers"),
  createAppointmentController,
);

export default router;
