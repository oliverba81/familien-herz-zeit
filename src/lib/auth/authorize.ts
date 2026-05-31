import bcrypt from "bcryptjs";
import { db } from "../db";
import { logger } from "../logging/logger";

export async function authorizeUser(
  email: string,
  password: string
): Promise<{ id: string; email: string; role: string } | null> {
  if (!email || !password) {
    await logger.warning("AUTH", "LOGIN_ATTEMPT", "Login attempt with missing credentials", undefined, undefined, {
      email: email || "missing",
    });
    return null;
  }

  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    await logger.warning("AUTH", "LOGIN_FAILED", `Failed login attempt: User not found`, undefined, undefined, {
      email,
    });
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    await logger.warning("AUTH", "LOGIN_FAILED", `Failed login attempt: Invalid password`, undefined, undefined, {
      email,
      userId: user.id,
    });
    return null;
  }

  // Prüfe ob User aktiv ist
  if (!user.isActive) {
    await logger.warning("AUTH", "LOGIN_FAILED", `Failed login attempt: User is disabled`, undefined, undefined, {
      email,
      userId: user.id,
    });
    return null;
  }

  await logger.success("AUTH", "LOGIN_SUCCESS", `User logged in successfully`, {
    email,
    userId: user.id,
    role: user.role,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

