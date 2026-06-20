import React from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import POSHeader from "./components/pos-header";

export default async function POSLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (!sessionId) {
    redirect("/login");
  }

  const parsedId = parseInt(sessionId as string, 10);
  if (isNaN(parsedId)) {
    redirect("/login");
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: parsedId as any },
      include: {
        role_rel: true,
      },
    });
  } catch (error) {
    console.error("Database connection error in POSLayout:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Database Connection Error</h1>
        <p className="text-gray-600 mb-4">
          Could not connect to the database. Please ensure your database server is running.
        </p>
      </div>
    );
  }

  if (!user) {
    redirect("/login");
  }

  const roleName = user.role_rel?.name || user.role;
  const isAuthorized = hasPermission("/pos", user.permissions as any, roleName);

  if (!isAuthorized) {
    redirect("/profile");
  }

  const hasDashboardPermission = hasPermission("/dashboard", user.permissions as any, roleName);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <POSHeader
        userName={user.name}
        roleName={roleName || "Cashier"}
        hasDashboardPermission={hasDashboardPermission}
      />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
