import z from "zod";

export const RegisterSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters")
		.max(100, "Name must not exceed 100 characters"),

	email: z
		.string()
		.trim()
		.email("Invalid email address")
		.max(100, "Email must not exceed 100 characters")
		.toLowerCase(),

	password: z
		.string()
		.min(4, "Password must be at least 4 characters")
		.max(100, "Password must not exceed 100 characters"),
});

export const LoginSchema = z.object({
	email: z
		.string()
		.trim()
		.email("Invalid email address")
		.max(100, "Email must not exceed 100 characters")
		.toLowerCase(),

	password: z
		.string()
		.min(4, "Password must be at least 4 characters")
		.max(100, "Password must not exceed 100 characters"),
});
