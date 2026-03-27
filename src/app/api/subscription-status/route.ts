import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ active: false }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      subscription: {
        select: {
          stripeSubscriptionId: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  const sub = user?.subscription;
  const active =
    !!sub?.stripeSubscriptionId &&
    (sub.status === "ACTIVE" || sub.status === "PAST_DUE") &&
    (sub.currentPeriodEnd === null || sub.currentPeriodEnd > new Date());

  return NextResponse.json({ active }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
