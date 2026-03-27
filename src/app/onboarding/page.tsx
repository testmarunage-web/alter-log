import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * オンボーディング質問フローは廃止。
 * 登録直後のユーザーに空のプロフィールを自動生成し、ダッシュボードへシームレスに遷移する。
 */
export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
    update: {},
  });

  const existingProfile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  if (!existingProfile) {
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        goal: "",
        industry: "",
        coachStyle: "",
        mainChallenge: "",
        aiPersonaPrompt: "",
      },
    });
  }

  redirect("/dashboard");
}
