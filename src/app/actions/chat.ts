"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// ユーザーを取得または作成（外部キーエラー防止）
async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
    update: {},
  });
}

// チャット履歴を取得
export async function getChatHistory(mode: "journal" | "coach") {
  const user = await getOrCreateUser();

  if (mode === "journal") {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return entries.map((e) => ({
      id: e.id,
      role: "user" as const,
      content: e.content,
      createdAt: e.createdAt,
    }));
  } else {
    const messages = await prisma.coachMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return messages.map((m) => ({
      id: m.id,
      role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt,
    }));
  }
}

// 壁打ちセッションのメッセージ履歴を全削除してリセット
export async function resetSession(sessionId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  // 所有者チェック
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== user.id) throw new Error("Invalid session");

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { sessionId } }),
    prisma.session.update({ where: { id: sessionId }, data: { usedCount: 0 } }),
  ]);
}

// メッセージを保存
export async function saveChatMessage(
  mode: "journal" | "coach",
  content: string,
  role: "user" | "ai" = "user"
) {
  const user = await getOrCreateUser();

  if (mode === "journal") {
    const entry = await prisma.journalEntry.create({
      data: { userId: user.id, content },
    });
    console.log("[saveChatMessage] journal saved | entryId:", entry.id, "| userId:", user.id);
    revalidatePath("/dashboard");
    revalidatePath("/");
    return entry;
  } else {
    return prisma.coachMessage.create({
      data: { userId: user.id, role, content },
    });
  }
}
