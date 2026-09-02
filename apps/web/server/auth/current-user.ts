import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthenticatedUser } from "./contracts";
import { SESSION_COOKIE_NAME } from "./cookie";
import { authAdapter } from "./postgres-adapter";

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return authAdapter.resolve(token);
}

export async function requireCurrentUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
