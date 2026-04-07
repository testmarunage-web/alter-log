/**
 * Webhook失敗時のフォールバック：Stripeを直接問い合わせてDBを更新する。
 * /payment-pending でポーリングがタイムアウトした際に呼ばれる。
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const log = process.env.NODE_ENV !== "production" ? console.log.bind(console) : () => {};

// M-1: インメモリレート制限（Vercelサーバーレスのベストエフォート実装）
// 同一ユーザーからの呼び出しを1分に1回まで制限する
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 1分

/** DB上でisActiveかどうかを判定する共通ロジック（layoutと同一ロジック） */
function checkIsActive(sub: {
  stripeSubscriptionId: string | null;
  status: string;
} | null): boolean {
  return (
    !!sub?.stripeSubscriptionId &&
    (sub.status === "ACTIVE" || sub.status === "PAST_DUE")
  );
}

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // レート制限チェック
  const now = Date.now();
  const lastCall = rateLimitMap.get(clerkId);
  if (lastCall && now - lastCall < RATE_LIMIT_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT_MS - (now - lastCall)) / 1000);
    return NextResponse.json(
      { error: "rate_limited", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  rateLimitMap.set(clerkId, now);

  log(`[subscription-activate] start clerkId=${clerkId}`);

  // ── Step 1: DBからユーザーを取得 ──────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { subscription: true },
  });

  if (!user) {
    console.error(`[subscription-activate] FAILED: user not found in DB clerkId=${clerkId}`);
    return NextResponse.json({ activated: false, reason: "user_not_found" });
  }

  log(`[subscription-activate] user found userId=${user.id} subscription=${JSON.stringify({
    status: user.subscription?.status,
    stripeCustomerId: user.subscription?.stripeCustomerId,
    stripeSubscriptionId: user.subscription?.stripeSubscriptionId,
    currentPeriodEnd: user.subscription?.currentPeriodEnd,
  })}`);

  // ── Step 2: 既にACTIVEなら即返す ─────────────────────────────────────────
  if (checkIsActive(user.subscription)) {
    log(`[subscription-activate] already active in DB — returning true`);
    return NextResponse.json({ activated: true });
  }

  // ── Step 3: StripeのCustomer IDを取得 ─────────────────────────────────────
  let customerId = user.subscription?.stripeCustomerId ?? null;
  log(`[subscription-activate] customerId from DB: ${customerId}`);

  if (!customerId) {
    const customers = await stripe.customers.search({
      query: `metadata["clerkId"]:"${clerkId}"`,
    });
    customerId = customers.data[0]?.id ?? null;
    log(`[subscription-activate] customerId from Stripe search: ${customerId} (found ${customers.data.length} customers)`);
  }

  if (!customerId) {
    console.error(`[subscription-activate] FAILED: no Stripe customer found clerkId=${clerkId}`);
    return NextResponse.json({ activated: false, reason: "customer_not_found" });
  }

  // ── Step 4: Stripeから有効なサブスクリプションを取得 ─────────────────────
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  const activeSub = subscriptions.data[0];
  log(`[subscription-activate] Stripe active subscriptions: ${subscriptions.data.length} found. activeSub=${activeSub?.id ?? "none"}`);

  if (!activeSub) {
    console.error(`[subscription-activate] FAILED: no active subscription in Stripe customerId=${customerId}`);
    return NextResponse.json({ activated: false, reason: "no_active_subscription" });
  }

  // ── Step 5: DBを更新 ──────────────────────────────────────────────────────
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
    log(`[subscription-activate] upsert completed for userId=${user.id} subscriptionId=${activeSub.id}`);
  } catch (err) {
    console.error("[subscription-activate] FAILED: DB upsert threw error:", err);
    return NextResponse.json({ activated: false, reason: "db_error" });
  }

  // ── Step 6: 更新後のDB状態を再読み込みして検証 ────────────────────────────
  const verified = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      stripeSubscriptionId: true,
      currentPeriodEnd: true,
    },
  });

  const isNowActive = checkIsActive(verified);
  log(`[subscription-activate] POST-VERIFICATION: isActive=${isNowActive} record=${JSON.stringify(verified)}`);

  if (!isNowActive) {
    console.error(`[subscription-activate] FAILED: DB updated but isActive still false. record=${JSON.stringify(verified)}`);
    return NextResponse.json({ activated: false, reason: "verification_failed" });
  }

  log(`[subscription-activate] SUCCESS clerkId=${clerkId}`);
  return NextResponse.json({ activated: true });
}
