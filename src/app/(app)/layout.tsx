import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "./_components/Sidebar";
import { BottomNav } from "./_components/BottomNav";
import { AddToHomePrompt } from "./_components/AddToHomePrompt";
import { ReadOnlyProvider } from "./_components/ReadOnlyProvider";
import { ReadOnlyBanner } from "./_components/ReadOnlyBanner";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // サブスクリプション有効性チェック
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

  // ユーザーレコードが存在しない、またはサブスクリプションが一度も作成されていない
  // → 未課金の新規ユーザーとして /subscribe にリダイレクト
  if (!user || !sub) {
    redirect("/subscribe");
  }

  // cancel_at_period_end で解約予約済みでも currentPeriodEnd が未来なら ACTIVE 扱い
  const now = new Date();
  const isActive =
    process.env.NODE_ENV === "development" ||
    sub.status === "ACTIVE" ||
    sub.status === "PAST_DUE" ||
    (sub.status === "CANCELED" && sub.currentPeriodEnd != null && sub.currentPeriodEnd > now);

  // 期間が完全に終了した場合のみ閲覧モードへ
  const isReadOnly = !isActive;

  return (
    <ReadOnlyProvider isReadOnly={isReadOnly}>
      <div className="flex h-[100dvh] bg-[#0B0E13] overflow-hidden">
        {/* PC: 左サイドバー */}
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
          <ReadOnlyBanner />
          <div className="flex-1 min-h-0 overflow-y-auto">
            {children}
          </div>
        </main>

        {/* スマホ: ボトムナビ */}
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>

        {/* PWA: ホーム画面に追加プロンプト */}
        <AddToHomePrompt />
      </div>
    </ReadOnlyProvider>
  );
}
