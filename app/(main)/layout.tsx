import { AppShell } from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/auth/signin");
  return <AppShell>{children}</AppShell>;
}
