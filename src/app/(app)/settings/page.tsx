import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 flex-shrink-0">
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

        {/* メインメニュー */}
        <div className="border border-white/[0.07] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>

          {/* メールアドレス */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-white/[0.06]">
            <span className="text-sm text-white/40">メールアドレス</span>
            <span className="text-xs text-white/50 truncate max-w-[55%] text-right">{email ?? "—"}</span>
          </div>

          {/* お支払い管理 */}
          <div className="border-b border-white/[0.06]">
            <a
              href="/api/stripe/portal"
              className="px-4 pt-4 pb-1.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-sm text-white/75">お支払い管理</span>
              <Chevron />
            </a>
            <p className="px-4 pb-3 text-[11px] text-white/25">サービスの解約はこちら</p>
          </div>

          {/* コミュニティに参加 */}
          <div className="border-b border-white/[0.06]">
            <a
              href="https://discord.gg/n5pnJEur72"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 pt-4 pb-1.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-sm text-white/75">コミュニティに参加</span>
              <Chevron />
            </a>
            <p className="px-4 pb-3 text-[11px] text-white/25">Discordコミュニティへのリンクが開きます</p>
          </div>

          {/* お問い合わせ */}
          <a
            href="mailto:support@alter-log.com"
            className="px-4 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
          >
            <span className="text-sm text-white/75">お問い合わせ</span>
            <Chevron />
          </a>
        </div>

        {/* ログアウト */}
        <div className="mt-4 border border-white/[0.05] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.012)" }}>
          <SignOutButton redirectUrl="/">
            <button
              type="button"
              className="w-full px-4 py-4 text-center text-sm text-red-400/55 hover:text-red-400/75 hover:bg-white/[0.02] transition-colors"
            >
              ログアウト
            </button>
          </SignOutButton>
        </div>

        {/* アカウント削除案内 */}
        <p className="mt-6 text-center text-[11px] text-white/25 leading-relaxed">
          アカウントを削除したい場合は{" "}
          <a href="mailto:support@alter-log.com" className="underline underline-offset-2 hover:text-white/40 transition-colors">
            support@alter-log.com
          </a>{" "}
          までご連絡ください。
        </p>

        {/* フッター：リーガルリンク（中央寄せ） */}
        <footer className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-2 pb-4">
          <a href="/terms" className="text-[10px] text-white/20 hover:text-white/38 transition-colors">利用規約</a>
          <a href="/privacy" className="text-[10px] text-white/20 hover:text-white/38 transition-colors">プライバシーポリシー</a>
          <a href="/tokushoho" className="text-[10px] text-white/20 hover:text-white/38 transition-colors">特定商取引法に基づく表記</a>
        </footer>
      </div>
    </main>
  );
}
