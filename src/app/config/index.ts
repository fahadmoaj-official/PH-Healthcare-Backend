import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
	NODE_ENV: process.env.NODE_ENV,
	PORT: process.env.PORT,
	DATABASE_URL: process.env.DATABASE_URL,
	BACKEND_URL: process.env.BACKEND_URL,
	FRONTEND_URL: process.env.FRONTEND_URL,
	BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS,
	JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
	JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
	JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN!,
	JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN!,
};
