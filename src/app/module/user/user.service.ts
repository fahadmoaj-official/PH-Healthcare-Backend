import { Request, Response } from "express";
import cloudinary from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import type { UploadApiResponse } from "cloudinary";

const uploadProfileImageService = async (buffer: Buffer, userId: string) => {
	const currentUser = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			imagePublicId: true,
		},
	});

	const CloudinaryResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						resource_type: "auto",
					},
					async (error, result) => {
						if (error || !result) {
							console.log("Cloudinary upload error:", error);
							return reject(new Error("Failed to upload image to Cloudinary"));
						}

						resolve(result);
					},
				)
				.end(buffer);
		},
	);

	// user image and imagePublicId will be updated in the database
	const user = await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			image: CloudinaryResult?.secure_url,
			imagePublicId: CloudinaryResult?.public_id,
		},
		omit: {
			password: true,
		},
	});

	if (currentUser?.imagePublicId) {
		try {
			await cloudinary.uploader.destroy(currentUser.imagePublicId);
			console.log(
				"Old image deleted from Cloudinary:",
				currentUser.imagePublicId,
			);
		} catch (error) {
			console.error("Error deleting old image from Cloudinary:", error);
		}
	}

	return user;
};

export const UserService = {
	uploadProfileImageService,
};
