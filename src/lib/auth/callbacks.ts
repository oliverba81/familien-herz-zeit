import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

export const jwtCallback = async ({
  token,
  user,
}: {
  token: JWT;
  user?: { id: string; role: string };
}) => {
  if (user) {
    token.id = user.id;
    token.role = user.role;
  }
  return token;
};

export const sessionCallback = async ({
  session,
  token,
}: {
  session: Session;
  token: JWT;
}) => {
  if (session.user) {
    session.user.id = token.id as string;
    session.user.role = token.role as string;
  }
  return session;
};

