import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AuthController } from "./auth.controller";
import validateRequest from "../../middleware/validateRequest";
import { RegisterSchema, LoginSchema } from "./auth.validation";

const router = Router();

router.post(
	"/register",
	validateRequest(RegisterSchema),
	AuthController.registerPatient,
);
router.post("/login", validateRequest(LoginSchema), AuthController.loginUser);
router.get(
	"/me",
	auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
	AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);

router.post("/google-login", AuthController.googleLogin);
export const AuthRoutes = router;
