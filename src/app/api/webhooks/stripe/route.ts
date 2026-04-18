import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 本番でも全ログを出力する（デバッグ・運用監視のため）
const log = console.log.bind(console);

/** Stripe の current_period_end (Unix秒) を安全に Date に変換する。
 *  undefined / null / NaN の場合は null を返す。 */
function toPeriodEnd(unixSec: number | null | undefined): Date | null {
  if (unixSec == null || !isFinite(unixSec)) return null;
  const d = new Date(unixSec * 1000);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  const webhookStart = Date.now();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("[stripe webhook] MISSING stripe-signature header");
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe webhook] MISSING STRIPE_WEBHOOK_SECRET env var");
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[stripe webhook] MISSING STRIPE_SECRET_KEY env var");
    return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe webhook] SIGNATURE VERIFICATION FAILED:", msg,
      "| secret prefix:", process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 12));
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  log(`[stripe webhook] received event=${event.type} id=${event.id} t=+${Date.now() - webhookStart}ms`);

  // 冪等性チェック：既に処理済みの event.id であればスキップ
  const alreadyProcessed = await prisma.processedStripeEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });
  if (alreadyProcessed) {
    log(`[stripe webhook] already processed event=${event.id}, skipping`);
    return NextResponse.json({ received: true, skipped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        // client_reference_id → metadata.clerkId の順で安全に取得
        const clerkId = session.client_reference_id ?? session.metadata?.clerkId ?? null;
        console.log("[stripe webhook] checkout.session.completed", {
          sessionId: session.id,
          clerkId,
          customerId: session.customer,
          subscriptionId: session.subscription,
          mode: session.mode,
        });
        if (!clerkId) {
          console.error("[stripe webhook] checkout.session.completed: clerkId not found", {
            sessionId: session.id,
            metadata: session.metadata,
            client_reference_id: session.client_reference_id,
          });
          break;
        }

        // customer / subscription は string | object どちらの場合も対応
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!customerId || !subscriptionId) {
          console.error("[stripe webhook] checkout.session.completed: missing customer or subscription", {
            sessionId: session.id,
            customer: session.customer,
            subscription: session.subscription,
          });
          break;
        }

        // Stripe API からサブスクリプション詳細を即時取得（invoice.payment_succeeded 待ち不要）
        let priceId: string | null = null;
        let periodEnd: Date | null = null;
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          priceId = sub.items.data[0]?.price.id ?? null;
          // current_period_end を直接参照（Unix秒）
          periodEnd = toPeriodEnd((sub as unknown as { current_period_end: number }).current_period_end);
          log(`[stripe webhook] subscription retrieved priceId=${priceId} periodEnd=${periodEnd?.toISOString()} t=+${Date.now() - webhookStart}ms`);
        } catch (subErr) {
          console.error("[stripe webhook] subscription retrieve failed (will save without price/period):", subErr);
        }

        // User をDBに確保（clerkIdで紐付け）
        let user: { id: string };
        try {
          user = await prisma.user.upsert({
            where: { clerkId },
            create: { clerkId },
            update: {},
          });
          log(`[stripe webhook] user upsert ok userId=${user.id} t=+${Date.now() - webhookStart}ms`);
        } catch (dbErr) {
          console.error("[stripe webhook] user upsert failed:", dbErr);
          throw dbErr;
        }

        // 全フィールドを一括で保存
        try {
          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              status: "ACTIVE",
              currentPeriodEnd: periodEnd,
            },
            update: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              status: "ACTIVE",
              currentPeriodEnd: periodEnd,
            },
          });
          log(`[stripe webhook] checkout.session.completed: DB updated clerkId=${clerkId} priceId=${priceId} t=+${Date.now() - webhookStart}ms`);
        } catch (dbErr) {
          console.error("[stripe webhook] subscription upsert failed:", dbErr);
          throw dbErr;
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // 新旧 Stripe API 両方に対応してsubscriptionIdを取得
        // 新API (Stripe API 2024+): invoice.parent.subscription_details.subscription
        // 旧API: invoice.subscription
        const subDetails = (invoice as unknown as { parent?: { subscription_details?: { subscription?: string | { id: string } } } }).parent?.subscription_details;
        const subscriptionId: string | null =
          (typeof subDetails?.subscription === "string"
            ? subDetails.subscription
            : subDetails?.subscription?.id)
          ?? (typeof (invoice as unknown as { subscription?: string | { id: string } }).subscription === "string"
            ? (invoice as unknown as { subscription: string }).subscription
            : ((invoice as unknown as { subscription?: { id: string } }).subscription?.id ?? null));

        if (!subscriptionId) {
          log("[stripe webhook] invoice.payment_succeeded: no subscriptionId, skipping");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id ?? null;
        // lines.data[0].period.end がサブスクリプション期間の正しい終了日時（UNIX秒）
        const periodEnd = toPeriodEnd(invoice.lines.data[0]?.period?.end);

        const result = await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            stripePriceId: priceId,
            status: "ACTIVE",
            currentPeriodEnd: periodEnd,
          },
        });
        log(`[stripe webhook] invoice.payment_succeeded: updated ${result.count} rows priceId=${priceId} periodEnd=${periodEnd?.toISOString()}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id ?? null;
        const subCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : (subscription.customer as Stripe.Customer | null)?.id ?? null;

        // 受信内容を必ずログ出力（Vercelで可視化）
        console.log("[stripe webhook] subscription.updated fields", {
          subId: subscription.id,
          stripeStatus: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          cancel_at: subscription.cancel_at,
          customerId: subCustomerId,
        });

        const orConditions: { stripeSubscriptionId?: string; stripeCustomerId?: string }[] = [
          { stripeSubscriptionId: subscription.id },
          ...(subCustomerId ? [{ stripeCustomerId: subCustomerId }] : []),
        ];
        const whereClause = { OR: orConditions };

        // 解約予約検知：cancel_at_period_end=true または cancel_at が設定済み
        // → 期間終了日まで ACTIVE を維持し cancelAtPeriodEnd フラグのみ立てる
        // → 実際に期間が終了した時点で customer.subscription.deleted が発火し CANCELED に移行
        const isCancelingAtPeriodEnd =
          subscription.cancel_at_period_end === true ||
          subscription.cancel_at != null;

        if (isCancelingAtPeriodEnd) {
          // cancel_at に期間終了タイムスタンプが入っている（cancel_at_period_end=true 時は Stripe が自動セット）
          const cancelPeriodEnd = toPeriodEnd(subscription.cancel_at);
          const cancelResult = await prisma.subscription.updateMany({
            where: whereClause,
            data: {
              status: "ACTIVE",        // 期間終了まで ACTIVE を維持
              cancelAtPeriodEnd: true, // UI表示用フラグ（「〇月〇日で終了予定」）
              currentPeriodEnd: cancelPeriodEnd,
            },
          });
          console.log("[stripe webhook] cancel_at_period_end → ACTIVE maintained", {
            count: cancelResult.count,
            subId: subscription.id,
            cancelPeriodEnd,
          });
          if (cancelResult.count === 0) {
            console.error("[stripe webhook] cancel_at_period_end: NO rows matched", {
              subId: subscription.id,
              customerId: subCustomerId,
            });
          }
          break;
        }

        // 通常の updated（解約なし）
        // dahlia API: current_period_end は latest_invoice line items から取得
        const retrievedSub = await stripe.subscriptions.retrieve(subscription.id, {
          expand: ["latest_invoice"],
        });
        const updatedInvoice = retrievedSub.latest_invoice as Stripe.Invoice | null;
        const periodEnd = toPeriodEnd(updatedInvoice?.lines?.data[0]?.period?.end);

        const statusMap: Record<string, "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED"> = {
          active: "ACTIVE",
          past_due: "PAST_DUE",
          canceled: "CANCELED",
          incomplete: "INACTIVE",
          incomplete_expired: "INACTIVE",
          trialing: "ACTIVE",
          unpaid: "PAST_DUE",
          paused: "INACTIVE",
        };
        const newStatus = statusMap[subscription.status] ?? "INACTIVE";

        // CANCELED 状態のレコードを ACTIVE に戻さない
        // （解約イベントの後に続く routine update で上書きされるのを防ぐ）
        // 再開（reactivation）の場合は Stripe が cancel_at_period_end=false かつ
        // previous_attributes.cancel_at_period_end=true を送るので別途対応が必要な場合は追加する
        const prevAttrs = event.data.previous_attributes as Record<string, unknown> | undefined;
        const wasReactivated = prevAttrs?.cancel_at_period_end === true || prevAttrs?.cancel_at != null;

        const updateResult = await prisma.subscription.updateMany({
          where: {
            ...whereClause,
            // CANCELED → ACTIVE の上書きは再開(reactivation)時のみ許可
            ...(newStatus === "ACTIVE" && !wasReactivated
              ? { NOT: { status: "CANCELED" } }
              : {}),
          },
          data: {
            stripePriceId: priceId,
            status: newStatus,
            currentPeriodEnd: periodEnd,
          },
        });
        console.log("[stripe webhook] subscription.updated → status updated", {
          count: updateResult.count,
          newStatus,
          wasReactivated,
        });
        if (updateResult.count === 0) {
          console.error("[stripe webhook] subscription.updated: NO rows matched", {
            subId: subscription.id,
            customerId: subCustomerId,
            newStatus,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const delCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : (subscription.customer as Stripe.Customer | null)?.id ?? null;

        // stripeSubscriptionId は再課金時の照合のために保持する（nullにしない）
        const deleteResult = await prisma.subscription.updateMany({
          where: {
            OR: [
              { stripeSubscriptionId: subscription.id },
              ...(delCustomerId ? [{ stripeCustomerId: delCustomerId }] : []),
            ],
          },
          data: {
            status: "CANCELED",
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
          },
        });
        if (deleteResult.count === 0) {
          console.error("[stripe webhook] subscription.deleted: NO rows updated", {
            subId: subscription.id,
            customerId: delCustomerId,
          });
        }
        break;
      }

      default:
        // 未処理イベントは無視
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[stripe webhook] event handling error (${event.type}):`, { message, stack });
    // エラー時は processed を記録しない → Stripe 側でリトライされた際に再処理される
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // 処理成功 → event.id を記録（以降の重複リトライを無視するため）
  try {
    await prisma.processedStripeEvent.create({ data: { id: event.id } });
  } catch {
    // 競合（Stripe の並列リトライ等）による unique 違反は無視
  }

  // 定期的に古いレコード（30日以上前）を削除（ベストエフォート）
  if (Math.random() < 0.01) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    prisma.processedStripeEvent
      .deleteMany({ where: { processedAt: { lt: thirtyDaysAgo } } })
      .catch(() => {});
  }

  return NextResponse.json({ received: true });
}
