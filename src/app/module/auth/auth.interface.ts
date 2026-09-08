import type { Role } from "../../../generated/prisma/browser";

export interface ILoginUserPayload {
	email: string;
	password: string;
}

export interface IRegisterPatientPayload {
	name: string;
	email: string;
	password: string;
}

export interface IRequestUser {
	userId: string;
	email: string;
	name: string;
	role: Role;
}

export interface IGoogleLoginPayload {
	Id_token: string;
}

export interface IResetPasswordPayload {
	email: string;
	otp: string;
	newPassword: string;
}

export interface IForgotPasswordPayload {
	email: string;
}

export interface IverifyPatientPayload {
	email: string;
	otp: string;
}
