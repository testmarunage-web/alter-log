"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
    update: {},
  });
}

const MAX_CONTENT_LENGTH = 8000;

export async function saveChatMessage(content: string) {
  if (!content || content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`メッセージは${MAX_CONTENT_LENGTH}文字以内で入力してください。`);
  }
  const user = await getOrCreateUser();
  const entry = await prisma.journalEntry.create({
    data: { userId: user.id, content },
  });
  revalidatePath("/dashboard");
  revalidatePath("/");
  return entry;
}
