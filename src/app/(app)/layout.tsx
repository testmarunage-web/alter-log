import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "./_components/Sidebar";
import { BottomNav } from "./_components/BottomNav";
import { AddToHomePrompt } from "./_components/AddToHomePrompt";

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
  // currentPeriodEndはStripe dahlia APIで取得値が不安定なため判定から除外。
  // サブスクリプションのライフサイクル管理はStripe側のstatusに完全に委任する。
  const isActive =
    !!sub?.stripeSubscriptionId &&
    (sub.status === "ACTIVE" || sub.status === "PAST_DUE");

  if (!isActive) {
    redirect("/subscribe");
  }

  return (
    <div className="flex h-[100dvh] bg-[#0B0E13] overflow-hidden">
      {/* PC: 左サイドバー */}
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* スマホ: ボトムナビ */}
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>

      {/* PWA: ホーム画面に追加プロンプト */}
      <AddToHomePrompt />
    </div>
  );
}
