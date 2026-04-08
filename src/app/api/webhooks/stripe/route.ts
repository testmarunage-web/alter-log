import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const log = process.env.NODE_ENV !== "production" ? console.log.bind(console) : () => {};

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

        // Subscription をACTIVEで保存（periodEndはinvoice.payment_succeededで後から更新される）
        try {
          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: null,
              status: "ACTIVE",
              currentPeriodEnd: null,
            },
            update: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              status: "ACTIVE",
            },
          });
          log(`[stripe webhook] checkout.session.completed: DB updated clerkId=${clerkId} t=+${Date.now() - webhookStart}ms`);
        } catch (dbErr) {
          console.error("[stripe webhook] subscription upsert failed:", dbErr);
          throw dbErr;
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // dahlia API: subscription は invoice.parent.subscription_details.subscription に移動
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionId =
          typeof subDetails?.subscription === "string"
            ? subDetails.subscription
            : subDetails?.subscription?.id ?? null;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id ?? null;
        // dahlia API: invoice.period_end はインボイス作成時刻を返すバグがある。
        // lines.data[0].period.end がサブスクリプション期間の正しい終了日時（UNIX秒）。
        const periodEnd = toPeriodEnd(invoice.lines.data[0]?.period?.end);

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            stripePriceId: priceId,
            status: "ACTIVE",
            currentPeriodEnd: periodEnd,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id ?? null;

        // cancel_at_period_end=true の場合：期間末解約済みとして即座にCANCELEDに変更。
        // Stripeは期間終了まで status="active" のままにするが、
        // 解約操作後に閲覧モードを発動させるためにDB側で先行してCANCELEDとする。
        if (subscription.cancel_at_period_end) {
          log(`[stripe webhook] cancel_at_period_end detected, setting CANCELED: subId=${subscription.id}`);
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { status: "CANCELED" },
          });
          break;
        }

        // dahlia API: current_period_end は Subscription 型から削除。latest_invoice の line items から取得。
        const retrievedSub = await stripe.subscriptions.retrieve(subscription.id, {
          expand: ["latest_invoice"],
        });
        const updatedInvoice = retrievedSub.latest_invoice as Stripe.Invoice | null;
        // lines.data[0].period.end がサブスクリプション期間の正しい終了日時（UNIX秒）
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
        const status = statusMap[subscription.status] ?? "INACTIVE";

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            stripePriceId: priceId,
            status,
            currentPeriodEnd: periodEnd,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // stripeSubscriptionId は再課金時の照合のために保持する（nullにしない）
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: "CANCELED",
            currentPeriodEnd: null,
          },
        });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
