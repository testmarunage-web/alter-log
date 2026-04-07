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
    // H-2: 重複作成防止 — DB に記録がなくても Stripe 側に既存 Customer がいる可能性があるため検索を先行する
    const existing = await stripe.customers.search({
      query: `metadata["clerkId"]:"${userId}"`,
      limit: 1,
    });
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        metadata: { clerkId: userId },
      });
      customerId = customer.id;
    }
  }

  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // JST 2026年4月30日までの期間限定クーポン（初月10%OFF）
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const isCouponActive = nowJST < new Date("2026-05-01T00:00:00+09:00");

  let session;
  try {
    session = await stripe.checkout.sessions.create({
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
      ...(isCouponActive ? { discounts: [{ coupon: "FEwVN2ER" }] } : {}),
      success_url: `${baseUrl}/payment-pending`,
      cancel_url: `${baseUrl}/subscribe`,
      metadata: { clerkId: userId },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe/checkout] session create failed:", message);
    return NextResponse.json(
      { error: "stripe_session_create_failed", detail: message },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
