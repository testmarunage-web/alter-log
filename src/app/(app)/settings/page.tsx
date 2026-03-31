import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;

  return (
    <main className="min-h-screen bg-[#0B0E13] text-[#E8E3D8] pb-28">
      <div className="max-w-lg mx-auto px-5 pt-10">
        {/* タイトル */}
        <p className="font-mono text-[9px] tracking-[0.22em] text-white/30 uppercase mb-6">設定</p>

        {/* アカウント */}
        <section className="mb-4">
          <p className="font-mono text-[8px] tracking-[0.18em] text-white/20 uppercase mb-2 px-1">アカウント</p>
          <div className="border border-white/[0.07] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>
            <div className="px-4 py-4 flex items-center justify-between">
              <span className="text-xs text-white/40">メールアドレス</span>
              <span className="text-xs text-white/65">{email ?? "—"}</span>
            </div>
          </div>
        </section>

        {/* サブスクリプション */}
        <section className="mb-4">
          <p className="font-mono text-[8px] tracking-[0.18em] text-white/20 uppercase mb-2 px-1">プラン</p>
          <div className="border border-white/[0.07] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>
            <a
              href="https://billing.stripe.com/p/login/placeholder"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-xs text-white/65">プラン・お支払い</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/25">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          </div>
        </section>

        {/* コミュニティ */}
        <section className="mb-4">
          <p className="font-mono text-[8px] tracking-[0.18em] text-white/20 uppercase mb-2 px-1">コミュニティ</p>
          <div className="border border-white/[0.07] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>
            <a
              href="https://discord.gg/placeholder"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-xs text-white/65">Discordコミュニティに参加</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/25">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          </div>
        </section>

        {/* ヘルプ */}
        <section className="mb-4">
          <p className="font-mono text-[8px] tracking-[0.18em] text-white/20 uppercase mb-2 px-1">サポート</p>
          <div className="border border-white/[0.07] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>
            <a
              href="mailto:support@alter-log.com"
              className="px-4 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-xs text-white/65">ヘルプ・お問い合わせ</span>
              <span className="text-[10px] text-white/25">support@alter-log.com</span>
            </a>
          </div>
        </section>

        {/* ログアウト */}
        <section className="mt-8">
          <div className="border border-white/[0.05] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.012)" }}>
            <SignOutButton redirectUrl="/">
              <button
                type="button"
                className="w-full px-4 py-4 text-left text-xs text-red-400/60 hover:text-red-400/80 hover:bg-white/[0.02] transition-colors"
              >
                ログアウト
              </button>
            </SignOutButton>
          </div>
        </section>

        {/* リーガル */}
        <div className="mt-10 flex gap-4 px-1">
          <a href="/tokushoho" className="text-[10px] text-white/20 hover:text-white/35 transition-colors">特定商取引法に基づく表記</a>
          <a href="/privacy" className="text-[10px] text-white/20 hover:text-white/35 transition-colors">プライバシーポリシー</a>
        </div>
      </div>
    </main>
  );
}
