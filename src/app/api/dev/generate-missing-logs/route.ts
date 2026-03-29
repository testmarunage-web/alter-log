import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateForDate } from "@/app/actions/generateAlterLog";

// 開発環境専用エンドポイント：今日（JST）のAlterLogを強制生成
// 既存のログを削除してから再生成するため、何度でもテスト可能
export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // JST で「今日」の UTC midnight を算出（date フィールドの保存形式と一致）
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const todayJstStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
    const todayDateUtc = new Date(`${todayJstStr}T00:00:00Z`); // UTC midnight of JST date

    // 既存の今日のログを削除（安全装置を外した強制再生成）
    await prisma.alterLog.deleteMany({
      where: { userId: user.id, date: todayDateUtc },
    });

    // 今日分を強制生成（createdAt には翌日 02:00〜04:00 JST の偽装時刻が設定される）
    await generateForDate(user.id, todayDateUtc);

    return NextResponse.json({
      ok: true,
      message: `AlterLog for ${todayJstStr} (JST) generated.`,
    });
  } catch (err) {
    console.error("[dev/generate-missing-logs]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
