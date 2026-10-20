import { Router } from "express";
import { validate } from "../../middlewares/validation.middleware";
import { loginSchema, userSchema } from "./user.schema";
import { loginController, profileController } from "./user.controller";
import { authenticate } from "../../middlewares/authentication.middleware";

const router = Router();

router.post("/auth/login", validate(loginSchema, "body"), loginController);
router.get(
  "/me",
  authenticate,
  validate(userSchema, "user"),
  profileController,
);

export default router;
