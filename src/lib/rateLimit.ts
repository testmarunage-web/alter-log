import { prisma } from "@/lib/prisma";

/**
 * DB ベースの日次レート制限ヘルパー。
 *
 * 同じ日付（JST）内の呼び出し回数を数え、指定の上限に達した場合は拒否する。
 * 日付が変わればカウンタは自動的にリセットされる。
 */

export const TRANSCRIBE_DAILY_LIMIT = 30;
export const SCAN_DAILY_LIMIT = 10;

type Kind = "transcribe" | "scan";

/** 今日（JST）の日付文字列 */
function getJstDateStr(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** 日付が今日（JST）と同じか判定 */
function isSameJstDay(d: Date | null | undefined): boolean {
  if (!d) return false;
  const today = getJstDateStr();
  const target = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const targetStr = [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, "0"),
    String(target.getDate()).padStart(2, "0"),
  ].join("-");
  return today === targetStr;
}

/**
 * 指定ユーザー・種別でレート制限チェック + カウント加算を原子的に行う。
 *
 * @returns `{ ok: true, remaining }` 許可、`{ ok: false, limit }` 制限超過
 */
export async function checkAndIncrementRateLimit(
  userId: string,
  kind: Kind,
): Promise<{ ok: true; remaining: number } | { ok: false; limit: number }> {
  const limit = kind === "transcribe" ? TRANSCRIBE_DAILY_LIMIT : SCAN_DAILY_LIMIT;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastTranscribeAt: true,
      transcribeCount: true,
      lastScanAt: true,
      scanCount: true,
    },
  });
  if (!user) return { ok: false, limit };

  const lastAt = kind === "transcribe" ? user.lastTranscribeAt : user.lastScanAt;
  const currentCount = kind === "transcribe" ? user.transcribeCount : user.scanCount;

  // 日付が変わっていればカウントをリセットして許可
  const sameDay = isSameJstDay(lastAt);
  const newCount = sameDay ? currentCount + 1 : 1;

  if (newCount > limit) {
    return { ok: false, limit };
  }

  // カウント更新
  const now = new Date();
  if (kind === "transcribe") {
    await prisma.user.update({
      where: { id: userId },
      data: { lastTranscribeAt: now, transcribeCount: newCount },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { lastScanAt: now, scanCount: newCount },
    });
  }

  return { ok: true, remaining: limit - newCount };
}
