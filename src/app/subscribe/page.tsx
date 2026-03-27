import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CheckoutButton } from "@/app/_components/CheckoutButton";
import { SignOutLink } from "@/app/_components/SignOutLink";

export default async function SubscribePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="min-h-screen bg-[#0B0E13] flex flex-col items-center justify-center px-6">
      {/* 背景グロー */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(ellipse, rgba(196,163,90,0.07) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* ロゴ */}
        <p className="text-sm font-black tracking-tight text-[#C4A35A]/70 mb-12">Alter Log</p>

        {/* メッセージ */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#C4A35A]/10 border border-[#C4A35A]/20 flex items-center justify-center mx-auto mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4A35A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          <h1 className="text-xl font-black text-[#F0EAD8] tracking-tight mb-3 leading-snug">
            アカウント登録が完了しました。
          </h1>
          <p className="text-sm text-[#8A8276] leading-relaxed">
            Alter Logを利用開始するには、サブスクリプション（月額2,980円）の登録を完了させてください。
          </p>
        </div>

        <CheckoutButton label="2,980円で決済を完了する" />

        <p className="mt-4 text-xs text-[#8A8276]/40">いつでもキャンセル可能</p>

        {/* ログアウト */}
        <div className="mt-12">
          <SignOutLink />
        </div>
      </div>
    </main>
  );
}
