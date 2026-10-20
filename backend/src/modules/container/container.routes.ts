import { Router } from "express";
import { validate } from "../../middlewares/validation.middleware";
import { findContainerSchema, listContainersSchema } from "./container.schema";
import {
  findContainerController,
  listContainersController,
} from "./container.controller";
import { authenticate } from "../../middlewares/authentication.middleware";
import { userSchema } from "../user/user.schema";

const router = Router();

router.get(
  "/",
  authenticate,
  validate(userSchema, "user"),
  validate(listContainersSchema, "query"),
  listContainersController,
);

router.get(
  "/:containerNumber",
  authenticate,
  validate(userSchema, "user"),
  validate(findContainerSchema, "params"),
  findContainerController,
);

export default router;
