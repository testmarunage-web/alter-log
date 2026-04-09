/**
 * POST /api/admin/repair-subscriptions
 *
 * stripePriceId または currentPeriodEnd が NULL のサブスクリプション行を
 * Stripe API から取得した情報で補完する修復エンドポイント。
 *
 * 本番環境でのみ有効。ADMIN_SECRET ヘッダーによる認証が必要。
 * 使用例:
 *   curl -X POST https://www.alter-log.com/api/admin/repair-subscriptions \
 *     -H "x-admin-secret: <ADMIN_SECRET>" \
 *     -H "Content-Type: application/json"
 */
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

function toPeriodEnd(unixSec: number | null | undefined): Date | null {
  if (unixSec == null || !isFinite(unixSec)) return null;
  const d = new Date(unixSec * 1000);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  // シークレットキー認証
  const secret = req.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // stripePriceId が NULL のサブスクリプションを取得
  const nullRows = await prisma.subscription.findMany({
    where: {
      OR: [
        { stripePriceId: null },
        { currentPeriodEnd: null },
      ],
      stripeSubscriptionId: { not: null },
      status: "ACTIVE",
    },
    select: {
      id: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      currentPeriodEnd: true,
    },
  });

  if (nullRows.length === 0) {
    return NextResponse.json({ message: "No rows to repair", repaired: 0 });
  }

  const results: { id: string; subId: string; status: "ok" | "error"; priceId?: string | null; periodEnd?: string | null; error?: string }[] = [];

  for (const row of nullRows) {
    const subId = row.stripeSubscriptionId!;
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      const priceId = sub.items.data[0]?.price.id ?? null;
      const periodEnd = toPeriodEnd((sub as unknown as { current_period_end: number }).current_period_end);

      await prisma.subscription.update({
        where: { id: row.id },
        data: {
          stripePriceId: priceId,
          currentPeriodEnd: periodEnd,
          // キャンセル済みは ACTIVE に戻さない
          ...(sub.status === "active" || sub.status === "trialing"
            ? { status: "ACTIVE" }
            : sub.status === "canceled"
            ? { status: "CANCELED" }
            : {}),
        },
      });

      results.push({ id: row.id, subId, status: "ok", priceId, periodEnd: periodEnd?.toISOString() ?? null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: row.id, subId, status: "error", error: msg });
    }
  }

  const succeeded = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;

  console.log(`[repair-subscriptions] done: ${succeeded} repaired, ${failed} failed`);

  return NextResponse.json({
    message: `${succeeded} rows repaired, ${failed} failed`,
    repaired: succeeded,
    failed,
    results,
  });
}
