import CredentialsProvider from "next-auth/providers/credentials";
import { authorizeUser } from "./authorize";

export const credentialsProvider = CredentialsProvider({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      return null;
    }

    return await authorizeUser(credentials.email, credentials.password);
  },
});

