"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const MAX_MEMO_LENGTH = 2000;

async function getActiveUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      subscription: { select: { status: true, currentPeriodEnd: true } },
    },
  });
  if (!user) throw new Error("Unauthorized");
  return user;
}

function isSubscriptionActive(sub: { status: string; currentPeriodEnd: Date | null } | null): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (!sub) return false;
  if (sub.status === "ACTIVE" || sub.status === "PAST_DUE") return true;
  if (sub.status === "CANCELED" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()) return true;
  return false;
}

export async function addMemo(content: string) {
  if (!content?.trim()) throw new Error("メモの内容を入力してください。");
  if (content.length > MAX_MEMO_LENGTH) {
    throw new Error(`メモは${MAX_MEMO_LENGTH}文字以内で入力してください。`);
  }
  const user = await getActiveUser();
  if (!isSubscriptionActive(user.subscription)) {
    throw new Error("サブスクリプションが無効です。");
  }
  const memo = await prisma.memo.create({
    data: { userId: user.id, content: content.trim() },
  });
  revalidatePath("/chat");
  return { id: memo.id, content: memo.content, createdAt: memo.createdAt };
}

export async function deleteMemo(memoId: string) {
  if (!memoId) throw new Error("Invalid memo ID");
  const user = await getActiveUser();
  if (!isSubscriptionActive(user.subscription)) {
    throw new Error("サブスクリプションが無効です。");
  }
  // 所有権チェック付き削除
  const memo = await prisma.memo.findFirst({
    where: { id: memoId, userId: user.id },
  });
  if (!memo) throw new Error("メモが見つかりません。");
  await prisma.memo.delete({ where: { id: memoId } });
  revalidatePath("/chat");
}
