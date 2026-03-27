import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "STRIPE_PRICE_ID is not set" }, { status: 500 });
  }

  // User upsert（外部キーエラー防止）
  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId },
    update: {},
    include: { subscription: true },
  });

  // すでに Stripe Customer ID がある場合は再利用
  let customerId = user.subscription?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerkId: userId },
    });
    customerId = customer.id;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    client_reference_id: userId, // Clerk userId をセッションに確実に紐付け
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/payment-pending`,
    cancel_url: `${baseUrl}/subscribe`,
    metadata: { clerkId: userId },
  });

  return NextResponse.json({ url: session.url });
}
