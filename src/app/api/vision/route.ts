import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_CHARS = 12000;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { vision: true },
  });

  return NextResponse.json({ vision: user?.vision ?? null });
}

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
  if (isReadOnly) {
    return NextResponse.json(
      { error: "Subscription required to update vision" },
      { status: 403 }
    );
  }

  let body: { vision?: string };
  try {
    body = (await req.json()) as { vision?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.vision ?? "";
  if (raw.length > MAX_CHARS) {
    return NextResponse.json({ error: "Vision too long" }, { status: 400 });
  }

  await prisma.user.update({
    where: { clerkId: userId },
    data: { vision: raw.trim() || null },
  });

  return NextResponse.json({ ok: true });
}
