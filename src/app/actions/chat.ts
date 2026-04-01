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

export async function saveChatMessage(content: string) {
  const user = await getOrCreateUser();
  const entry = await prisma.journalEntry.create({
    data: { userId: user.id, content },
  });
  revalidatePath("/dashboard");
  revalidatePath("/");
  return entry;
}
