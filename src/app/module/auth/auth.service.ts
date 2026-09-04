import bcrypt from "bcryptjs";
import type { TokenPayload } from "google-auth-library";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import { googleClient } from "../../lib/GoogleAuth";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import type {
	IGoogleLoginPayload,
	ILoginUserPayload,
	IRegisterPatientPayload,
	IRequestUser,
} from "./auth.interface";

const registerPatient = async (payload: IRegisterPatientPayload) => {
	const { name, password } = payload;
	const email = payload.email.trim().toLowerCase();

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
				create: { name, email },
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

	const isPasswordMatched = await bcrypt.compare(password, user.password);

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

	if (!user) {
		user = await prisma.user.create({
			data: {
				name: googleIdTokenPayload.name || "Unknown",
				email: googleIdTokenPayload.email || "",
				googleId: googleIdTokenPayload.sub,
				authProvider: "GOOGLE",
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

export const AuthService = {
	registerPatient,
	loginUser,
	getMe,
	refreshToken,
	googleLoginAuth,
};
