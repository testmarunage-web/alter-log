import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        // client_reference_id → metadata.clerkId の順で安全に取得
        const clerkId = session.client_reference_id ?? session.metadata?.clerkId ?? null;
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

        // サブスクリプション詳細を取得して priceId と期間を保存
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id ?? null;
        const periodEnd = new Date(subscription.current_period_end * 1000);

        const user = await prisma.user.upsert({
          where: { clerkId },
          create: { clerkId },
          update: {},
        });

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

        console.log(`[stripe webhook] checkout.session.completed: subscription activated for clerkId=${clerkId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id ?? null;
        const periodEnd = new Date(subscription.current_period_end * 1000);

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
        const periodEnd = new Date(subscription.current_period_end * 1000);

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

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            stripeSubscriptionId: null,
            stripePriceId: null,
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
