import { Router } from "express";
import { validate } from "../../middlewares/validation.middleware";
import { listContainersSchema } from "./container.schema";
import { listContainersController } from "./container.controller";
import { authenticate } from "../../middlewares/authentication.middleware";

const router = Router();

router.get(
  "/",
  authenticate,
  validate(listContainersSchema, "query"),
  listContainersController,
);

export default router;
