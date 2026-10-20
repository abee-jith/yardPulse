import { Router } from "express";

import userRoutes from "../modules/user/user.routes";
import containerRoutes from "../modules/container/container.routes";

const router = Router();

router.use("/v1", userRoutes);
router.use("/v1/containers", containerRoutes);
export default router;
