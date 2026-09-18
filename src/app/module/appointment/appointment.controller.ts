import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppoinmentServices } from "./appointment.service";
import { RequestUser } from "../../middleware/checkAuth";

const bookAppoinment = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const user = req.user!;

	const result = await AppoinmentServices.bookAppoinmentService(payload, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Appointment booked successfully",
		data: result,
	});
});

const bookAppoinmentCallback = catchAsync(
	async (req: Request, res: Response) => {
		const { redirectUrl } =
			await AppoinmentServices.bookAppoinmentCallbackService(req.query);

		res.redirect(redirectUrl);
	},
);

export const AppointmentController = {
	bookAppoinment,
	bookAppoinmentCallback,
};
