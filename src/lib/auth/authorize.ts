import bcrypt from "bcryptjs";
import { db } from "../db";

export async function authorizeUser(
  email: string,
  password: string
): Promise<{ id: string; email: string; role: string } | null> {
  if (!email || !password) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}


