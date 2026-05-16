/**
 * Server-side helpers for reading the current session.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
import { getServerSession } from "next-auth/next";
import { authOptions } from "./options";

export function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
