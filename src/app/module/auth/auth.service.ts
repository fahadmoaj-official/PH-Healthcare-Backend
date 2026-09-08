import bcrypt from "bcryptjs";
import type { TokenPayload } from "google-auth-library";
import Crypto from "crypto";
import type { JwtPayload, SignOptions } from "jsonwebtoken";

import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { googleClient } from "../../lib/GoogleAuth";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import type {
	IForgotPasswordPayload,
	IGoogleLoginPayload,
	ILoginUserPayload,
	IRegisterPatientPayload,
	IRequestUser,
	IResetPasswordPayload,
} from "./auth.interface";
import { RedisClient } from "../../lib/redis";
import { transporter } from "../../lib/nodeMailer";

const registerPatient = async (payload: IRegisterPatientPayload) => {
	const { name, password, email } = payload;

	// const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new Error("User with this email already exists");
	}

	const hashedPassword = await bcrypt.hash(password, 8);

	const createdUser = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role: Role.PATIENT,
			status: UserStatus.ACTIVE,
			emailVerified: false,
			patient: {
				create: {
					name,
					email,
				},
			},
		},
		omit: { password: true },
		include: { patient: true },
	});

	const { patient, ...user } = createdUser;
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.JWT_ACCESS_SECRET,
		config.JWT_ACCESS_EXPIRES_IN as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.JWT_REFRESH_SECRET,
		config.JWT_REFRESH_EXPIRES_IN as SignOptions,
	);

	return {
		user,
		patient,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new Error("User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (user.authProvider !== AuthProvider.CREDENTIAL) {
		throw new Error(
			`User is registered with Google. Please login using Google`,
		);
	}

	const isPasswordMatched = await bcrypt.compare(
		password,
		user.password as string,
	);

	if (!isPasswordMatched) {
		throw new Error("Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.JWT_ACCESS_SECRET,
		config.JWT_ACCESS_EXPIRES_IN as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.JWT_REFRESH_SECRET,
		config.JWT_REFRESH_EXPIRES_IN as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
		},
		include: {
			patient: true,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new Error("User not found");
	}

	return isUserExists;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.JWT_REFRESH_SECRET,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new Error(
			config.NODE_ENV === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new Error("User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.JWT_ACCESS_SECRET,
		config.JWT_ACCESS_EXPIRES_IN as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.JWT_REFRESH_SECRET,
		config.JWT_REFRESH_EXPIRES_IN as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const googleLoginAuth = async (payload: IGoogleLoginPayload) => {
	let googleIdTokenPayload: TokenPayload | null | undefined = null;
	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.Id_token,
			audience: config.GOOGLE_CLIENT_ID,
		});

		googleIdTokenPayload = ticket.getPayload();
	} catch (error) {
		console.log("Google Id Token verification failed:", error);
		throw new Error("Invalid or expired Google Id Token");
	}

	if (!googleIdTokenPayload) {
		throw new Error("Failed to retrieve Google Id Token payload");
	}

	const isPatientExistsWithGoogleAuth = await prisma.user.findUnique({
		where: {
			email: googleIdTokenPayload.email,
			role: Role.PATIENT,
			googleId: googleIdTokenPayload.sub,
		},
	});

	let user = isPatientExistsWithGoogleAuth;

	if (!isPatientExistsWithGoogleAuth) {
		// check if user exists with same email but different auth provider
		const isUserExistsWithCredentials = await prisma.user.findUnique({
			where: {
				email: googleIdTokenPayload.email,
				role: Role.PATIENT,
				authProvider: AuthProvider.GOOGLE,
			},
		});

		// check if user is blocked or deleted
		if (isUserExistsWithCredentials) {
			if (isUserExistsWithCredentials.status === UserStatus.BLOCKED) {
				throw new Error("User is blocked");
			}
			if (
				isUserExistsWithCredentials.isDeleted ||
				isUserExistsWithCredentials.status === UserStatus.DELETED
			) {
				throw new Error("User is deleted");
			}

			user = await prisma.user.update({
				where: {
					id: isUserExistsWithCredentials.id,
				},
				data: {
					googleId: googleIdTokenPayload.sub,
					emailVerified: true,
				},
			});
		}

		user = await prisma.user.create({
			data: {
				name: googleIdTokenPayload.name || "Unknown",
				email: googleIdTokenPayload.email || "",
				googleId: googleIdTokenPayload.sub,
				authProvider: AuthProvider.GOOGLE,
				role: Role.PATIENT,
				status: UserStatus.ACTIVE,
				emailVerified: true,
				patient: {
					create: {
						name: googleIdTokenPayload.name || "Unknown",
						email: googleIdTokenPayload.email || "",
					},
				},
			},
		});
	}

	if (!user) {
		throw new Error("User not found or created");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}
	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.JWT_ACCESS_SECRET,
		config.JWT_ACCESS_EXPIRES_IN as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.JWT_REFRESH_SECRET,
		config.JWT_REFRESH_EXPIRES_IN as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const forgotPasswordAuth = async (payload: IForgotPasswordPayload) => {
	const { email } = payload;

	const IsUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (!IsUserExists) {
		throw new Error("User Does not Exist by forgetAuth");
	}

	if (IsUserExists.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (IsUserExists.isDeleted || IsUserExists.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (IsUserExists.authProvider !== AuthProvider.CREDENTIAL) {
		throw new Error(
			"User is registered with Google. Please login using Google",
		);
	}

	// otp genarte

	const otp = Crypto.randomInt(100000, 999999).toString();

	const key = `forgot-password:${email}`;

	await RedisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: 5 * 60, // 5 minutes in seconds
		},
	});

	await transporter.sendMail({
		from: config.SMTP_SENDER,
		to: IsUserExists.email,
		subject: "Password Reset OTP",
		text: `Your OTP for password reset is: ${otp}. It will expire in 5 minutes.`,
	});
};

const resetPasswordAuth = async (payload: IResetPasswordPayload) => {
	const { email, otp, newPassword } = payload;

	const IsUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (!IsUserExists) {
		throw new Error("User Does not Exist by forgetAuth");
	}

	if (IsUserExists.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (IsUserExists.isDeleted || IsUserExists.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (IsUserExists.authProvider !== AuthProvider.CREDENTIAL) {
		throw new Error(
			"User is registered with Google. Please login using Google",
		);
	}

	// otp genarte

	const Get_otp = await RedisClient.get(`forgot-password:${email}`);

	if (!Get_otp) {
		throw new Error("OTP has expired or is invalid");
	}

	if (Get_otp !== otp) {
		throw new Error("Invalid OTP");
	}

	const hashedPassword = await bcrypt.hash(
		newPassword,
		Number(config.BCRYPT_SALT_ROUNDS),
	);

	await prisma.user.update({
		where: {
			email: IsUserExists.email,
		},
		data: {
			password: hashedPassword,
		},
	});

	await RedisClient.del(`forgot-password:${email}`);

	await transporter.sendMail({
		from: config.SMTP_SENDER,
		to: IsUserExists.email,
		subject: "Password Change Successful",
		text: `Your password has been changed successfully.`,
	});

	return {
		message: "OTP verified successfully and password reset",
	};
};

export const AuthService = {
	registerPatient,
	loginUser,
	getMe,
	refreshToken,
	googleLoginAuth,
	resetPasswordAuth,
	forgotPasswordAuth,
};
