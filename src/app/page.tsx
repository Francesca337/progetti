import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getUserByToken } from "@/lib/auth";
import { LandingForm } from "@/components/LandingForm";

export const dynamic = "force-dynamic";

async function exchangeToken(token: string) {
  "use server";
  const user = await prisma.user.findUnique({ where: { token } });
  if (!user) return { ok: false as const, error: "Link non valido o scaduto" };
  const store = await cookies();
  store.set("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return { ok: true as const, role: user.role };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const sp = await searchParams;
  const store = await cookies();

  // Token in URL → set cookie e redirect
  if (sp.t) {
    const user = await getUserByToken(sp.t);
    if (user) {
      store.set("session_token", sp.t, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
      redirect(user.role === "ADMIN" ? "/app" : "/me");
    }
  }

  // Cookie esistente → redirect
  const cookieToken = store.get("session_token")?.value;
  if (cookieToken) {
    const user = await getUserByToken(cookieToken);
    if (user) redirect(user.role === "ADMIN" ? "/app" : "/me");
  }

  // Verifica se esiste già un admin
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  const setupNeeded = adminCount === 0;

  return <LandingForm setupNeeded={setupNeeded} exchangeToken={exchangeToken} />;
}
