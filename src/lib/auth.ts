import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { customAlphabet } from "nanoid";
import type { User } from "@prisma/client";

const tokenAlphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const tokenGen = customAlphabet(tokenAlphabet, 32);

export function generateToken(): string {
  return tokenGen();
}

export async function getUserByToken(token: string | undefined | null): Promise<User | null> {
  if (!token) return null;
  return prisma.user.findUnique({ where: { token } });
}

/**
 * Resolves the current user from cookie. Used by admin pages.
 */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get("session_token")?.value;
  return getUserByToken(token);
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  return user;
}
