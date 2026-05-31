import { NextAuthOptions } from "next-auth";
import { credentialsProvider } from "./providers";
import { jwtCallback, sessionCallback } from "./callbacks";

export const authOptions: NextAuthOptions = {
  providers: [credentialsProvider],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
  pages: {
    signIn: "/admin/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};


