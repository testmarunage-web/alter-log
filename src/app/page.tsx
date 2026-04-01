import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// コンポーネント: Alterロゴ
// ─────────────────────────────────────────────────────────────────────────────
export function AlterIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14,3 A8,8 0 1,0 18,10 L14,3 Z" fill="#C4A35A" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// コンポーネント: スクリーンショットカード（スマホ枠風）
// ─────────────────────────────────────────────────────────────────────────────
function ScreenshotCard({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{
      background: "#1a1a1a",
      borderRadius: "28px",
      padding: "8px",
      boxShadow: "0 0 30px rgba(196,163,90,0.12), 0 0 0 1px rgba(255,255,255,0.06)",
      width: "100%",
      maxWidth: "280px",
      lineHeight: 0,
      position: "relative",
    }}>
      {/* ノッチ風バー */}
      <div style={{
        position: "absolute",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "80px",
        height: "4px",
        background: "#333",
        borderRadius: "2px",
        zIndex: 1,
      }} />
      {/* スクリーン */}
      <div style={{ borderRadius: "20px", overflow: "hidden", lineHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          style={{ display: "block", width: "100%", height: "auto" }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ページ本体（Server Component）
// ─────────────────────────────────────────────────────────────────────────────
export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/chat?mode=journal");

  return (
    <main className="min-h-screen bg-[#0B0E13] text-[#E8E3D8] flex flex-col selection:bg-[#C4A35A]/30">

      {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#0B0E13]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlterIcon size={22} />
            <span className="text-base font-black tracking-tight text-[#E8D5A0]">Alter Log</span>
          </div>
          <Link href="/sign-in"
            className="text-xs font-bold px-4 py-2 rounded-full border border-white/[0.12] text-[#8A8276] hover:text-[#E8E3D8] hover:border-white/20 transition-colors">
            ログイン
          </Link>
        </div>
      </header>

      {/* ── 1. Hero Section ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-32 pb-24 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(ellipse, rgba(196,163,90,0.08) 0%, transparent 70%)" }} />
        </div>

        <h1 className="relative text-3xl sm:text-5xl md:text-6xl font-black leading-[1.4] sm:leading-[1.2] tracking-tight max-w-4xl text-[#F0EAD8]">
          <span className="inline-block">あなた以上に、</span><span className="inline-block">あなたを知る。</span><br />
          <span className="text-[#C4A35A] inline-block">「究極の客観視」</span><span className="inline-block">を手に入れる。</span>
        </h1>

        <p className="mt-8 text-[#8A8276] text-sm sm:text-base max-w-2xl leading-relaxed mx-auto px-4">
          <span className="inline-block">溜め込んだ思考や感情を、</span><span className="inline-block">そのまま吐き出してみませんか？</span><br className="hidden sm:block" />
          <span className="inline-block">専属AI「Alter」があなたの言葉を静かに受け止め、</span><span className="inline-block">無意識のパターンを解き明かします。</span>
        </p>

        <div className="mt-10">
          <Link href="/sign-up" className="inline-flex flex-col items-center justify-center px-10 py-3.5 rounded-full bg-[#C4A35A] text-[#0B0E13] hover:bg-[#D4B36A] hover:shadow-[0_0_32px_rgba(196,163,90,0.4)] active:scale-[0.98] transition-all duration-300">
            <span className="font-bold text-sm sm:text-base tracking-wide">Alter Logを始める</span>
            <span className="text-[10px] sm:text-xs font-semibold mt-0.5 opacity-80">初月2,682円（10%OFF）</span>
          </Link>
          <p className="mt-3 text-xs text-[#8A8276]/60">お申し込みから7日以内にご満足いただけなければ、全額返金いたします。</p>
        </div>

      </section>

      {/* ── 2. Problem / Agitation ── */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#0B0E13] to-[#12161E]">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl font-black text-[#F0EAD8] mb-8 tracking-tight">
            「自分の思考」という密室から、抜け出そう。
          </h2>

          <div className="space-y-6 text-sm sm:text-base text-[#8A8276] leading-relaxed text-center max-w-2xl px-2">
            <p>
              <span className="inline-block">思考を整理するために</span><span className="inline-block">日記やジャーナリングを試しても、</span><span className="inline-block">結局自分の枠を出られない。</span>
            </p>
            <p>
              <span className="inline-block">一人で内省を繰り返しても、</span><span className="inline-block">同じ悩みをループし、</span><span className="inline-block">自分自身を客観視するには限界がある。</span>
            </p>
            <p>
              <span className="inline-block">かといって、</span><span className="inline-block">プロのコーチングを受けるのは</span><span className="inline-block">ハードルが高い。</span>
            </p>

            <p className="text-[#E8D5A0] font-bold mt-12 text-xl sm:text-2xl tracking-tight">
              Alter Log ── それは「ジャーナリング2.0」。
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Features ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto space-y-32">

          {/* 01 */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/2 space-y-4 text-center md:text-left">
              <span className="font-mono text-sm text-[#C4A35A]/40 tracking-widest">01</span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#F0EAD8] leading-tight">
                <span className="inline-block">言葉にならないモヤモヤも、</span><br className="hidden md:block" />
                <span className="inline-block">そのまま受け止める。</span>
              </h3>
              <p className="text-sm text-[#8A8276] leading-relaxed max-w-xl mx-auto md:mx-0">
                綺麗な文章を書く必要はありません。思い浮かんだ感情やまとまらない思考、誰かへの不満を、あなたが一番気楽に本音を出せる方法で打ち明けてください。Alterはあなたを許容し、すべてを静かに聞き入れます。
              </p>
            </div>
            <div className="w-full md:w-1/2 flex items-center justify-center">
              <ScreenshotCard src="/images/screenshot-journal.jpg" alt="ジャーナル入力画面" />
            </div>
          </div>

          {/* 02 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="w-full md:w-1/2 space-y-4 text-center md:text-left">
              <span className="font-mono text-sm text-[#C4A35A]/40 tracking-widest">02</span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#F0EAD8] leading-tight">
                <span className="inline-block">忖度ゼロの「鏡」が、</span><br className="hidden md:block" />
                <span className="inline-block">ハッとする気づきをくれる。</span>
              </h3>
              <p className="text-sm text-[#8A8276] leading-relaxed max-w-xl mx-auto md:mx-0">
                人間相手のコーチングでは、どうしても遠慮や同調が生まれてしまいます。Alterにはそれがありません。あなたの何気ない言葉から「よく使う口癖」や「無意識のバイアス」を抽出し、あなた自身すら気づいていない「ハッとする真実」を突きつけます。
              </p>
            </div>
            <div className="w-full md:w-1/2 flex items-center justify-center">
              <ScreenshotCard src="/images/screenshot-scan-top.jpg" alt="SCAN分析画面" />
            </div>
          </div>

          {/* 03 */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/2 space-y-4 text-center md:text-left">
              <span className="font-mono text-sm text-[#C4A35A]/40 tracking-widest">03</span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#F0EAD8] leading-tight">
                <span className="inline-block">あなたが眠る間に書き上げられる</span><br className="hidden md:block" />
                <span className="inline-block">「あなたの観察日記」</span>
              </h3>
              <p className="text-sm text-[#8A8276] leading-relaxed max-w-xl mx-auto md:mx-0">
                深夜、Alterはあなたの記録をもとに、密かに「あなたについての観察日記」を書き上げます。翌朝その日記を覗き見ることで、自分の脳内をまるで他人のもののように客観視する、かつてない未知の体験が待っています。
              </p>
            </div>
            <div className="w-full md:w-1/2 flex items-center justify-center">
              <ScreenshotCard src="/images/screenshot-alterlog.jpg" alt="Alter Log観察日記画面" />
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. Comparison ── */}
      <section className="py-24 px-6 bg-[#0B0E13]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center text-[#F0EAD8] mb-16 tracking-tight">
            自分と向き合うための、<br className="hidden sm:block" />
            新しい選択肢。
          </h2>

          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-[#8A8276] text-xs uppercase tracking-wider">
                  <th className="py-4 px-4 font-normal w-1/4"></th>
                  <th className="py-4 px-4 font-bold text-[#E8D5A0] text-center w-1/4 bg-[#C4A35A]/10 rounded-t-xl border-x border-t border-[#C4A35A]/30 whitespace-nowrap">Alter Log</th>
                  <th className="py-4 px-4 font-normal text-center w-1/4 whitespace-nowrap">手書きの日記</th>
                  <th className="py-4 px-4 font-normal text-center w-1/4 whitespace-nowrap">プロのコーチング</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-white/5">
                  <td className="py-5 px-4 text-[#E8E3D8] font-bold whitespace-nowrap">心理的安全性</td>
                  <td className="py-5 px-4 text-center text-[#C4A35A] bg-[#C4A35A]/5 border-x border-[#C4A35A]/30 font-bold whitespace-nowrap">◎ 一切の評価・ジャッジなし</td>
                  <td className="py-5 px-4 text-center text-[#8A8276] whitespace-nowrap">◎ 誰にも見られない</td>
                  <td className="py-5 px-4 text-center text-[#8A8276] whitespace-nowrap">△ 人の目が気になる</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-5 px-4 text-[#E8E3D8] font-bold whitespace-nowrap">新しい気づき</td>
                  <td className="py-5 px-4 text-center text-[#C4A35A] bg-[#C4A35A]/5 border-x border-[#C4A35A]/30 font-bold whitespace-nowrap">◎ Alterが思考の癖を指摘</td>
                  <td className="py-5 px-4 text-center text-[#8A8276] whitespace-nowrap">△ 思考が堂々巡りになる</td>
                  <td className="py-5 px-4 text-center text-[#8A8276] whitespace-nowrap">◎ プロの視点が得られる</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-5 px-4 text-[#E8E3D8] font-bold whitespace-nowrap">手軽さ・即時性</td>
                  <td className="py-5 px-4 text-center text-[#C4A35A] bg-[#C4A35A]/5 border-x border-[#C4A35A]/30 font-bold whitespace-nowrap">◎ ベッドや移動中、スマホ1つで</td>
                  <td className="py-5 px-4 text-center text-[#8A8276] whitespace-nowrap">△ ノートを持ち歩く手間</td>
                  <td className="py-5 px-4 text-center text-[#8A8276] whitespace-nowrap">× 予約と日程調整が必要</td>
                </tr>
                <tr>
                  <td className="py-5 px-4 text-[#E8E3D8] font-bold whitespace-nowrap">継続しやすさ</td>
                  <td className="py-5 px-4 text-center text-[#C4A35A] bg-[#C4A35A]/5 border-x border-b border-[#C4A35A]/30 rounded-b-xl font-bold whitespace-nowrap">◎ 新たな気づきがあるから続く</td>
                  <td className="py-5 px-4 text-center text-[#8A8276] whitespace-nowrap">× 3日で白紙に戻りがち</td>
                  <td className="py-5 px-4 text-center text-[#8A8276] whitespace-nowrap">△ 高額な費用がネックに</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-center mt-16">
            <div className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full border border-[#C4A35A]/25 bg-[#C4A35A]/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4A35A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-base text-[#E8D5A0] font-black tracking-tight">7日間全額返金保証</span>
            </div>
            <p className="mt-5 text-sm text-[#8A8276] leading-relaxed max-w-2xl mx-auto">
              Alter Logは、使えば価値が伝わるサービスだと確信しています。<br className="hidden sm:block" />
              お申し込みから7日以内にご満足いただけなければ、理由を問わず全額返金いたします。
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. 3ステップ ── */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#0B0E13] to-[#12161E]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-[#F0EAD8] mb-4 tracking-tight">
              始めるのは簡単。気づきは、すぐに。
            </h2>
            <p className="text-sm text-[#8A8276] max-w-lg mx-auto leading-relaxed">
              登録からわずか数日で、変化を実感できます。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C4A35A]/10 border border-[#C4A35A]/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-xs text-[#C4A35A]/70 font-bold">1</span>
                </div>
                <h3 className="text-base font-black text-[#F0EAD8] leading-tight">思考を吐き出す</h3>
              </div>
              <p className="text-sm text-[#8A8276] leading-relaxed">
                頭の中のモヤモヤを、テキストでも音声でも、そのままジャーナルに。整える必要はありません。Alterが全てを静かに受け止めます。
              </p>
              <div className="flex justify-center pt-2">
                <ScreenshotCard src="/images/screenshot-journal.jpg" alt="ジャーナル入力画面" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C4A35A]/10 border border-[#C4A35A]/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-xs text-[#C4A35A]/70 font-bold">2</span>
                </div>
                <h3 className="text-base font-black text-[#F0EAD8] leading-tight">究極の客観視を手に入れる</h3>
              </div>
              <p className="text-sm text-[#8A8276] leading-relaxed">
                Alterがジャーナルを読み解き、思考の構造を分析。あなた専用の「観察日記」と「思考プロファイル」で、自分を他人のように見つめる体験が始まります。
              </p>
              <div className="flex justify-center pt-2">
                <ScreenshotCard src="/images/screenshot-alterlog.jpg" alt="Alter Log観察日記画面" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C4A35A]/10 border border-[#C4A35A]/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-xs text-[#C4A35A]/70 font-bold">3</span>
                </div>
                <h3 className="text-base font-black text-[#F0EAD8] leading-tight">続けるほど、変化が見える</h3>
              </div>
              <p className="text-sm text-[#8A8276] leading-relaxed">
                ムードマップやワードクラウドで、過去の自分と今の自分を比較。1週間前には見えなかった自分の変化に気づく瞬間が訪れます。
              </p>
              <div className="flex justify-center pt-2">
                <ScreenshotCard src="/images/screenshot-dashboard.jpg" alt="ダッシュボード画面" />
              </div>
            </div>
          </div>

          {/* 3枚のスクリーンショット: 中央大・左右小・重なり */}
          <div className="mt-14 flex items-end justify-center" style={{ gap: 0 }}>
            {/* 左: SCAN */}
            <div style={{ transform: "scale(0.88) translateX(24px)", transformOrigin: "bottom right", zIndex: 1, opacity: 0.85, flexShrink: 0 }}>
              <ScreenshotCard src="/images/screenshot-scan-top.jpg" alt="SCAN分析画面" />
            </div>
            {/* 中央: ジャーナル（最大） */}
            <div style={{ transform: "scale(1.08)", transformOrigin: "bottom center", zIndex: 3, flexShrink: 0 }}>
              <ScreenshotCard src="/images/screenshot-journal.jpg" alt="ジャーナル入力画面" />
            </div>
            {/* 右: Alter Log */}
            <div style={{ transform: "scale(0.88) translateX(-24px)", transformOrigin: "bottom left", zIndex: 1, opacity: 0.85, flexShrink: 0 }}>
              <ScreenshotCard src="/images/screenshot-alterlog.jpg" alt="Alter Log観察日記画面" />
            </div>
          </div>

        </div>
      </section>

      {/* ── 区切り線 ── */}
      <div className="w-full border-t border-white/[0.04]" />

      {/* ── 6. Final CTA ── */}
      <section className="relative py-32 px-6 text-center overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(ellipse, rgba(196,163,90,0.08) 0%, transparent 70%)" }} />
        </div>

        <h2 className="relative text-3xl sm:text-4xl md:text-5xl font-black text-[#F0EAD8] mb-6 leading-tight tracking-tighter">
          <span className="inline-block">本当の自分と、</span><br className="hidden sm:block" />
          <span className="inline-block">もう一度出会う場所。</span>
        </h2>
        <p className="relative text-[#8A8276] text-sm sm:text-base mb-10 max-w-lg mx-auto leading-relaxed">
          あなたを最も理解するAlterが、ここで待っています。
        </p>

        <div className="relative flex flex-col items-center">
          <Link href="/sign-up" className="inline-flex flex-col items-center justify-center px-10 py-3.5 rounded-full bg-[#C4A35A] text-[#0B0E13] hover:bg-[#D4B36A] hover:shadow-[0_0_32px_rgba(196,163,90,0.4)] active:scale-[0.98] transition-all duration-300">
            <span className="font-bold text-sm sm:text-base tracking-wide">Alter Logを始める</span>
            <span className="text-[10px] sm:text-xs font-semibold mt-0.5 opacity-80">初月2,682円（10%OFF）</span>
          </Link>
          <p className="mt-3 text-xs text-[#8A8276]/60">お申し込みから7日以内にご満足いただけなければ、全額返金いたします。</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-12 px-6 bg-[#0B0E13]">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-6 text-center">

          <div className="flex items-center gap-2 justify-center">
            <AlterIcon size={16} />
            <p className="text-base font-black text-[#C4A35A]/70 tracking-tight">Alter Log</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs text-[#8A8276]/60 font-medium">
            <Link href="/terms" className="hover:text-[#E8E3D8] transition">利用規約</Link>
            <Link href="/privacy" className="hover:text-[#E8E3D8] transition">プライバシーポリシー</Link>
            <Link href="/tokushoho" className="hover:text-[#E8E3D8] transition">特定商取引法に基づく表記</Link>
          </div>
          <p className="text-xs text-[#8A8276]/30">© 2026 Alter Log. All Rights Reserved.</p>
        </div>
      </footer>

    </main>
  );
}
