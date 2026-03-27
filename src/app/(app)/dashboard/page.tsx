import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./_components/DashboardClient";
import { getLatestAlterLog } from "@/app/actions/generateAlterLog";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const initialAlterLog = await getLatestAlterLog();

  return <DashboardClient initialAlterLog={initialAlterLog} />;
}
