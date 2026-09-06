import { Role, UserStatus } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

// super admin seeding
export const seedSuperAdmin = async () => {
	if (
		!config.SUPER_ADMIN_NAME ||
		!config.SUPER_ADMIN_EMAIL ||
		!config.SUPER_ADMIN_PASSWORD
	) {
		console.log(
			"Super Admin credentials are not properly set in the environment variables.-------------------->",
		);
		throw new Error(
			"Super Admin credentials are not properly configured in environment variables.",
		);
	}

	try {
		const existingSuperAdmin = await prisma.user.findFirst({
			where: {
				role: Role.SUPER_ADMIN,
			},
		});

		if (existingSuperAdmin) {
			console.log("Super Admin already exists. Skipping seeding.");
			return;
		}

		const superAdminData = {
			name: config.SUPER_ADMIN_NAME,
			email: config.SUPER_ADMIN_EMAIL,
			password: config.SUPER_ADMIN_PASSWORD,
			role: Role.SUPER_ADMIN,
			status: UserStatus.ACTIVE,
			emailVerified: true,
		};

		const hashedPassword = await bcrypt.hash(
			superAdminData.password,
			Number(config.BCRYPT_SALT_ROUNDS) || 10,
		);

		const createdSuperAdmin = await prisma.user.create({
			data: {
				...superAdminData,
				password: hashedPassword,
			},
		});

		console.log("Super Admin seeded successfully:", {
			id: createdSuperAdmin.id,
			email: createdSuperAdmin.email,
			password: superAdminData.password,
			role: createdSuperAdmin.role,
		});
	} catch (error) {
		console.error("Error seeding Super Admin:", error);
	}
};

// tester Admin seeding
export const seedTesterAdmin = async () => {
	if (
		!config.TESTER_ADMIN_NAME ||
		!config.TESTER_ADMIN_EMAIL ||
		!config.TESTER_ADMIN_PASSWORD
	) {
		console.log(
			"Tester Admin credentials are not properly set in the environment variables.-------------------->",
		);
		throw new Error(
			"Tester Admin credentials are not properly configured in environment variables.",
		);
	}

	try {
		const existingTesterAdmin = await prisma.user.findFirst({
			where: {
				role: Role.ADMIN,
			},
		});

		if (existingTesterAdmin) {
			console.log("Tester Admin already exists. Skipping seeding.");
			return;
		}

		const testerAdminData = {
			name: config.TESTER_ADMIN_NAME,
			email: config.TESTER_ADMIN_EMAIL,
			password: config.TESTER_ADMIN_PASSWORD,
			role: Role.ADMIN,
			status: UserStatus.ACTIVE,
			emailVerified: true,
		};

		const hashedPassword = await bcrypt.hash(
			testerAdminData.password,
			Number(config.BCRYPT_SALT_ROUNDS) || 10,
		);

		const createdTesterAdmin = await prisma.user.create({
			data: {
				...testerAdminData,
				password: hashedPassword,
			},
		});

		console.log("Tester Admin seeded successfully:", {
			id: createdTesterAdmin.id,
			email: createdTesterAdmin.email,
			password: testerAdminData.password,
			role: createdTesterAdmin.role,
		});
	} catch (error) {
		console.error("Error seeding Tester Admin:", error);
	}
};

// tester Doctor seeding
export const seedTesterDoctor = async () => {
	if (
		!config.TESTER_DOCTOR_NAME ||
		!config.TESTER_DOCTOR_EMAIL ||
		!config.TESTER_DOCTOR_PASSWORD
	) {
		console.log(
			"Tester Doctor credentials are not properly set in the environment variables.-------------------->",
		);
		throw new Error(
			"Tester Doctor credentials are not properly configured in environment variables.",
		);
	}

	try {
		const existingTesterDoctor = await prisma.user.findFirst({
			where: {
				role: Role.DOCTOR,
			},
		});

		if (existingTesterDoctor) {
			console.log("Tester Doctor already exists. Skipping seeding.");
			return;
		}

		const testerDoctorData = {
			name: config.TESTER_DOCTOR_NAME,
			email: config.TESTER_DOCTOR_EMAIL,
			password: config.TESTER_DOCTOR_PASSWORD,
			role: Role.DOCTOR,
			status: UserStatus.ACTIVE,
			emailVerified: true,
		};

		const hashedPassword = await bcrypt.hash(
			testerDoctorData.password,
			Number(config.BCRYPT_SALT_ROUNDS) || 10,
		);

		const createdTesterDoctor = await prisma.user.create({
			data: {
				...testerDoctorData,
				password: hashedPassword,
			},
		});

		console.log("Tester Doctor seeded successfully:", {
			id: createdTesterDoctor.id,
			email: createdTesterDoctor.email,
			password: testerDoctorData.password,
			role: createdTesterDoctor.role,
		});
	} catch (error) {
		console.error("Error seeding Tester Doctor:", error);
	}
};
