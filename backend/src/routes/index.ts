import { Router } from "express";

import userRoutes from "../modules/user/user.routes";
import containerRoutes from "../modules/container/container.routes";
import appointmentRoutes from "../modules/appointment/appointment.route";

const router = Router();

router.use("/v1", userRoutes);
router.use("/v1/containers", containerRoutes);
router.use("/v1/appointments", appointmentRoutes);
export default router;
