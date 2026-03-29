import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateMissingDailyLogs } from "@/app/actions/generateAlterLog";

// 開発環境専用エンドポイント：過去の未生成 AlterLog を手動実行
export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await generateMissingDailyLogs(userId);
    return NextResponse.json({ ok: true, message: "Missing daily logs generated." });
  } catch (err) {
    console.error("[dev/generate-missing-logs]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
