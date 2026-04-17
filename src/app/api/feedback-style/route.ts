import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_STYLES = ["direct", "neutral", "empathetic"];

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { subscription: { select: { status: true, currentPeriodEnd: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const sub = user.subscription;
  const now = new Date();
  const isReadOnly =
    sub == null ||
    sub.status === "INACTIVE" ||
    (sub.status === "CANCELED" && (sub.currentPeriodEnd == null || sub.currentPeriodEnd <= now));
  if (isReadOnly && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  let body: { feedbackStyle?: string };
  try {
    body = (await req.json()) as { feedbackStyle?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.feedbackStyle || !VALID_STYLES.includes(body.feedbackStyle)) {
    return NextResponse.json({ error: "Invalid feedbackStyle" }, { status: 400 });
  }

  await prisma.user.update({
    where: { clerkId: userId },
    data: { feedbackStyle: body.feedbackStyle },
  });

  return NextResponse.json({ ok: true });
}
