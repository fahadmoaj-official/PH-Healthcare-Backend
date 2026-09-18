import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { UserRoutes } from "./app/module/user/user.route";
import { getBkashIdToken } from "./app/lib/bkash";
import { appointmentRoutes } from "./app/module/appointment/appointment.route";

const app: Application = express();

app.use(
	cors({
		origin: config.FRONTEND_URL,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/appointment", appointmentRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
	});
});

// test routes
app.post("/test", async (req: Request, res: Response) => {
	const getbkashIdToken = await getBkashIdToken();
	console.log(getBkashIdToken);

	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
		bkash: getbkashIdToken,
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
