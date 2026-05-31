import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

/**
 * Für Server Components: Holt Session oder redirectet zu Login
 */
export async function getSessionOrRedirect() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

/**
 * Für Server Components: Prüft Role oder redirectet
 */
export async function requireRoleOrRedirect(roles: UserRole[]) {
  const session = await getSessionOrRedirect();
  if (!roles.includes(session.user.role as UserRole)) {
    redirect("/admin");
  }
  return session;
}

/**
 * Für API Route Handlers: Prüft Role oder wirft Response
 */
export async function requireRoleOrThrow(roles: UserRole[]): Promise<{ user: { id: string; email: string; role: string } }> {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new NextResponse(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!roles.includes(session.user.role as UserRole)) {
    throw new NextResponse(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return session as { user: { id: string; email: string; role: string } };
}

/**
 * Für API Route Handlers: Prüft nur ob eingeloggt
 */
export async function requireAuthOrThrow(): Promise<{ user: { id: string; email: string; role: string } }> {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new NextResponse(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return session as { user: { id: string; email: string; role: string } };
}





