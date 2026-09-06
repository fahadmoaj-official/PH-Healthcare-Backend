import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { catchAsync } from "../utils/catchAsync";

const validateRequest = (schema: ZodSchema) => {
	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.body);

		if (!result.success) {
			return res.status(400).json({
				success: false,
				message: "Validation failed by zod custom middleware",
				errors: result.error.issues,
			});
		}

		req.body = result.data;

		next();
	});
};

export default validateRequest;
