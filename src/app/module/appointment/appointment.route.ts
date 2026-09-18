import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";

import validateRequest from "../../middleware/validateRequest";
import { AppointmentController } from "./appointment.controller";

const router = Router();

router.post("/book-appointment", AppointmentController.bookAppoinment);
router.get(
	"/book-appointment/payment/callback",
	AppointmentController.bookAppoinmentCallback,
);

export const appointmentRoutes = router;
