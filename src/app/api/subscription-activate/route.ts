/**
 * Webhook失敗時のフォールバック：Stripeを直接問い合わせてDBを更新する。
 * /payment-pending でポーリングがタイムアウトした際に呼ばれる。
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { subscription: true },
  });

  if (!user) {
    console.error(`[subscription-activate] user not found clerkId=${clerkId}`);
    return NextResponse.json({ activated: false, reason: "user_not_found" });
  }

  // 既にACTIVEなら即返す
  const alreadyActive =
    user.subscription?.stripeSubscriptionId &&
    (user.subscription.status === "ACTIVE" || user.subscription.status === "PAST_DUE") &&
    (user.subscription.currentPeriodEnd === null || user.subscription.currentPeriodEnd > new Date());

  if (alreadyActive) {
    console.log(`[subscription-activate] already active clerkId=${clerkId}`);
    return NextResponse.json({ activated: true });
  }

  // StripeのCustomer IDを取得（DBにあればそれを使用、なければメタデータで検索）
  let customerId = user.subscription?.stripeCustomerId ?? null;

  if (!customerId) {
    const customers = await stripe.customers.search({
      query: `metadata["clerkId"]:"${clerkId}"`,
    });
    customerId = customers.data[0]?.id ?? null;
  }

  if (!customerId) {
    console.error(`[subscription-activate] stripe customer not found clerkId=${clerkId}`);
    return NextResponse.json({ activated: false, reason: "customer_not_found" });
  }

  // Stripeから有効なサブスクリプションを取得
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  const activeSub = subscriptions.data[0];
  if (!activeSub) {
    console.error(`[subscription-activate] no active subscription in Stripe clerkId=${clerkId} customerId=${customerId}`);
    return NextResponse.json({ activated: false, reason: "no_active_subscription" });
  }

  // DBを直接更新（Webhookと同じロジック）
  try {
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: activeSub.id,
        stripePriceId: activeSub.items.data[0]?.price.id ?? null,
        status: "ACTIVE",
        currentPeriodEnd: null,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: activeSub.id,
        stripePriceId: activeSub.items.data[0]?.price.id ?? null,
        status: "ACTIVE",
      },
    });
    console.log(`[subscription-activate] DB updated clerkId=${clerkId} subscriptionId=${activeSub.id}`);
    return NextResponse.json({ activated: true });
  } catch (err) {
    console.error("[subscription-activate] DB update failed:", err);
    return NextResponse.json({ activated: false, reason: "db_error" });
  }
}
