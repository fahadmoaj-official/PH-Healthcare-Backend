import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";
import httpStatus from "http-status";
import { buffer } from "stream/consumers";

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
	if (!req.file || !req.file.buffer) {
		throw new Error("No image data provided");
	}

	const userId = req.user?.userId as string;

	const result = await UserService.uploadProfileImageService(
		req.file?.buffer,
		userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile image uploaded successfully",
		data: result,
	});
});

export const UserController = {
	uploadProfileImage,
};
