import { getServerSession } from "next-auth";
import { authOptions } from "./config";
import { redirect } from "next/navigation";

type UserRole = "ADMIN" | "EDITOR";

interface RequireRoleOptions {
  redirectTo?: string;
  throwError?: boolean;
}

/**
 * Prüft ob der User eingeloggt ist und die erforderliche Rolle hat
 * @param roles Erlaubte Rollen
 * @param options Optionen für Redirect oder Error
 * @returns Session wenn erfolgreich, sonst null oder throw
 */
export async function requireRole(
  roles: UserRole[],
  options: RequireRoleOptions = {}
): Promise<{ user: { id: string; email: string; role: string } } | null> {
  const { redirectTo = "/admin/login", throwError = false } = options;

  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    if (throwError) {
      throw new Error("Unauthorized");
    }
    if (redirectTo) {
      redirect(redirectTo);
    }
    return null;
  }

  const userRole = session.user.role as UserRole;

  if (!roles.includes(userRole)) {
    if (throwError) {
      throw new Error("Forbidden");
    }
    if (redirectTo) {
      redirect(redirectTo);
    }
    return null;
  }

  return session;
}

/**
 * Kurzform für requireRole mit nur ADMIN
 */
export async function requireAdmin(
  options: RequireRoleOptions = {}
): Promise<{ user: { id: string; email: string; role: string } } | null> {
  return requireRole(["ADMIN"], options);
}


