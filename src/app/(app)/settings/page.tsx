import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/25 flex-shrink-0">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;

  return (
    <main className="min-h-screen bg-[#0B0E13] text-[#E8E3D8] pb-32">
      <div className="max-w-lg mx-auto px-5 pt-10">
        {/* タイトル */}
        <h1 className="text-lg font-bold text-[#E8E3D8] mb-8 tracking-tight">設定</h1>

        {/* アカウント */}
        <section className="mb-6">
          <p className="font-mono text-[8px] tracking-[0.18em] text-white/25 uppercase mb-2 px-1">アカウント</p>
          <div className="border border-white/[0.07] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>
            <div className="px-4 py-4 flex items-center justify-between">
              <span className="text-sm text-white/45">メールアドレス</span>
              <span className="text-xs text-white/55 truncate max-w-[55%] text-right">{email ?? "—"}</span>
            </div>
          </div>
        </section>

        {/* プラン */}
        <section className="mb-6">
          <p className="font-mono text-[8px] tracking-[0.18em] text-white/25 uppercase mb-2 px-1">プラン</p>
          <div className="border border-white/[0.07] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>
            <a
              href="https://billing.stripe.com/p/login/placeholder"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-sm text-white/65">プラン・お支払い</span>
              <ChevronRight />
            </a>
          </div>
        </section>

        {/* コミュニティ */}
        <section className="mb-6">
          <p className="font-mono text-[8px] tracking-[0.18em] text-white/25 uppercase mb-2 px-1">コミュニティ</p>
          <div className="border border-white/[0.07] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>
            <a
              href="https://discord.gg/placeholder"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-sm text-white/65">Discordコミュニティに参加</span>
              <ChevronRight />
            </a>
          </div>
        </section>

        {/* サポート */}
        <section className="mb-6">
          <p className="font-mono text-[8px] tracking-[0.18em] text-white/25 uppercase mb-2 px-1">サポート</p>
          <div className="border border-white/[0.07] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>
            <a
              href="mailto:support@alter-log.com"
              className="px-4 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-sm text-white/65">ヘルプ・お問い合わせ</span>
              <span className="text-[10px] text-white/30 flex-shrink-0">support@alter-log.com</span>
            </a>
          </div>
        </section>

        {/* ログアウト */}
        <section className="mb-10">
          <div className="border border-white/[0.05] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.012)" }}>
            <SignOutButton redirectUrl="/">
              <button
                type="button"
                className="w-full px-4 py-4 text-left text-sm text-red-400/55 hover:text-red-400/75 hover:bg-white/[0.02] transition-colors"
              >
                ログアウト
              </button>
            </SignOutButton>
          </div>
        </section>

        {/* フッター：リーガルリンク */}
        <footer className="flex flex-wrap gap-x-5 gap-y-2 px-1 pb-4">
          <a href="/terms" className="text-[10px] text-white/20 hover:text-white/38 transition-colors">利用規約</a>
          <a href="/privacy" className="text-[10px] text-white/20 hover:text-white/38 transition-colors">プライバシーポリシー</a>
          <a href="/tokushoho" className="text-[10px] text-white/20 hover:text-white/38 transition-colors">特定商取引法に基づく表記</a>
        </footer>
      </div>
    </main>
  );
}
