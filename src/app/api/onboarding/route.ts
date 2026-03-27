import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { goal, industry, coachStyle, mainChallenge } = await req.json();
  if (!goal || !industry || !coachStyle || !mainChallenge) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
    update: {},
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, goal, industry, coachStyle, mainChallenge, aiPersonaPrompt: "" },
    update: { goal, industry, coachStyle, mainChallenge, aiPersonaPrompt: "" },
  });

  return NextResponse.json({ success: true });
}
