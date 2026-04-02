import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL ?? "https://alter-log.com"));

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { subscription: true },
  });

  const customerId = user?.subscription?.stripeCustomerId ?? null;

  if (!customerId) {
    // 未課金ユーザーは設定ページに戻す
    return NextResponse.redirect(new URL("/settings", process.env.NEXT_PUBLIC_APP_URL ?? "https://alter-log.com"));
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://alter-log.com"}/settings`,
  });

  return NextResponse.redirect(session.url);
}
