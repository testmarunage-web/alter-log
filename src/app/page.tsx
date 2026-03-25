import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ────────────────────────────────────────────────
// データ定義
// ────────────────────────────────────────────────
const problems = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: "書くこと自体が目的化する",
    body: "綺麗に書こうとするあまり「書くこと」がゴールになり、肝心の「行動を振り返り、次をどうするか考える」余裕がなくなってしまう。",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
    title: "自分への「問い」が浅い",
    body: "1人で書いていると表面的な感情の吐き出しで終わり、「なぜそう感じたのか」「どうすべきだったか」という壁打ちによる深掘りができない。",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: "過去のデータが埋もれる",
    body: "書きっぱなしで読み返す仕組みがないため、過去の重要な気づきや自分のパターンを忘れ、また同じ失敗や感情のブレを繰り返してしまう。",
  },
];

const features = [
  {
    num: "01",
    title: "ブラウザですぐ開けるWebアプリ。圧倒的に低いハードル",
    body: "アプリのインストールも、文字を綺麗にまとめる必要もありません。ブラウザを開いてテキストを打ち込むだけで、AIが自動で文脈を構造化・蓄積します。通勤中も、会議後の3分でも完結します。",
  },
  {
    num: "02",
    title: "あなたを深く知るからこそ出せる「今日、向き合うべき問い」",
    body: "指示を考える必要はありません。過去の文脈を理解したAIが、「先週悩んでいたあの件、どうなりましたか？」と専用の問いを投げます。何も思いつかない日は、短く答えるだけ。",
  },
  {
    num: "03",
    title: "対話を通じて進化する、あなた専用の壁打ち相手",
    body: "日々の対話を通じて、AIのスタンスがあなたに最もフィットする形へシームレスに変化します。感情のブレーキ役や、足りない視点の提供など、外資コンサルレベルの鋭さで機能します。",
  },
  {
    num: "04",
    title: "行動変容を加速させる週次の成果報告レポート",
    body: "過去のデータが埋もれることはありません。1週間の軌跡を整理した成果報告レポートが自動生成されます。自分の変化を客観的に認識し、翌週の行動を確実に見直せます。",
  },
];

const voices = [
  {
    name: "Tさん",
    role: "30代 マネージャー",
    initial: "T",
    body: "疲れて何も考えられない日でも、AIから過去を踏まえた質問が来るので、自然と打ち返しています。自分では気づいていなかったボトルネックを指摘され、翌日の指示が変わりました。",
  },
  {
    name: "R.Sさん",
    role: "30代 経営者",
    initial: "R",
    body: "A案かB案かで迷って愚痴を打ち込んだら、「過去の記録から、あなたは利益率よりもスピードを重視した時の方が後悔していませんね」と返ってきました。自分の判断軸を再確認できました。",
  },
  {
    name: "AYAさん",
    role: "20代 フリーランス",
    initial: "A",
    body: "1週間ごとの振り返りを見て、自分がどれだけ「時間がない」と言い訳していたか可視化されました。感情の波に飲み込まれにくくなった気がします。",
  },
];

// ────────────────────────────────────────────────
// ページ本体
// ────────────────────────────────────────────────
export default async function Home() {
  const { userId } = await auth();
  const isLoggedIn = !!userId;
  const ctaHref = isLoggedIn ? "/chat" : "/sign-up";
  const ctaLabel = isLoggedIn ? "チャット画面へ進む →" : "無料で壁打ちを始める";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

      {/* ── Nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-800/70 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-15 h-[60px] flex items-center justify-between">
          <span className="text-base font-black tracking-tight text-white">Hack Log</span>
          <div className="flex items-center gap-4">
            <a href="#features" className="hidden md:block text-xs font-semibold text-slate-400 hover:text-white transition">コアバリュー</a>
            <a href="#voices" className="hidden md:block text-xs font-semibold text-slate-400 hover:text-white transition">受講者の声</a>
            <a href="#pricing" className="hidden md:block text-xs font-semibold text-slate-400 hover:text-white transition">料金</a>
            {isLoggedIn ? (
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4">
                <Link href="/chat">チャットへ →</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-bold px-4">
                <Link href="/sign-in">ログイン</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-44 pb-28 overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-600/6 rounded-full blur-3xl" />
        </div>

        <Badge variant="outline"
          className="mb-8 border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs tracking-widest px-4 py-1.5 uppercase font-semibold">
          ジャーナリング 2.0
        </Badge>

        <h1 className="relative text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tighter max-w-3xl">
          続くだけではなく
          <br />
          結果が変わる
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            ジャーナリング2.0
          </span>
        </h1>

        <p className="mt-8 text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed">
          ブラウザを開くだけ。話すことがない日でも、AIから「今日向き合うべき問い」が届きます。
          <br className="hidden md:block" />
          あなたの思考を記憶し、壁打ちに付き合い、行動を変え、結果を出すパーソナルコーチです。
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Button asChild size="lg"
            className="bg-orange-600 hover:bg-orange-500 text-white font-black px-10 py-6 text-base rounded-full shadow-2xl shadow-orange-900/40 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
          {!isLoggedIn && (
            <p className="text-xs text-slate-600">クレジットカード不要・今すぐ開始</p>
          )}
        </div>
      </section>

      {/* ── Problems ── */}
      <section className="bg-slate-900 border-y border-slate-800 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center text-white mb-16 tracking-tight">
            これまでの日記では、なぜ結果が変わらなかったのか？
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {problems.map((p) => (
              <div key={p.title}
                className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl text-center">
                <div className="w-14 h-14 bg-slate-700 text-yellow-300 rounded-full flex items-center justify-center mx-auto mb-6">
                  {p.icon}
                </div>
                <h3 className="text-base font-bold text-yellow-300 mb-3">{p.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-widest text-slate-500 uppercase text-center mb-3">Core Value</p>
          <h2 className="text-2xl sm:text-3xl font-black text-center text-white mb-20 tracking-tight">
            Hack Log のコアバリュー
          </h2>
          <div className="space-y-16">
            {features.map((f, i) => (
              <div key={f.num}
                className={`flex flex-col md:flex-row items-center gap-10 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
                <div className="md:w-1/2">
                  <span className="text-blue-500 font-black text-lg tracking-wider mb-2 block">{f.num}</span>
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-4 leading-snug">{f.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm sm:text-base">{f.body}</p>
                </div>
                <div className="md:w-1/2 w-full">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center">
                    <span className="text-5xl font-black text-slate-800">{f.num}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator className="bg-slate-800" />

      {/* ── Voices ── */}
      <section id="voices" className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-widest text-slate-500 uppercase text-center mb-3">Testimonials</p>
          <h2 className="text-2xl sm:text-3xl font-black text-center text-white mb-14 tracking-tight">
            モニター受講者の声
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {voices.map((v) => (
              <div key={v.name}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-6 rounded-2xl flex flex-col gap-4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-sm font-bold shrink-0">
                    {v.initial}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{v.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{v.role}</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed flex-grow">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator className="bg-slate-800" />

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 bg-slate-950">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-widest text-slate-500 uppercase text-center mb-3">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-black text-center text-white mb-4 tracking-tight">
            専属のビジネスコーチを、
            <br />
            圧倒的な手軽さで。
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed text-center mb-12 max-w-lg mx-auto">
            月額数万円の体験を、Webアプリで手軽に。
            Hack Log は、あなたの思考を記憶し、向こうから問いかけ、壁打ちに付き合い、週次の振り返りまでを行う「あなた専属のコーチ」です。
          </p>

          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 md:p-12">
            {/* 比較 */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-5 mb-7 text-sm">
              <span className="text-slate-500 font-semibold">一般的なコーチング</span>
              <span className="text-slate-600 line-through font-medium">月額 3万円〜</span>
            </div>

            <div className="text-center mb-8">
              <p className="text-slate-400 text-sm font-bold mb-2">Hack Log（あなた専属コーチ）</p>
              <div className="flex justify-center items-end gap-2">
                <span className="text-6xl font-black text-white tracking-tighter">¥3,000</span>
                <span className="text-slate-500 text-base pb-2">/ 月（税込）</span>
              </div>
              <p className="text-yellow-400 text-xs font-bold mt-3">
                ※アーリーバード価格。解約しない限り、永遠に¥3,000のまま。
              </p>
              <p className="text-slate-600 text-xs mt-1">期限終了後の標準価格 ¥5,000/月</p>
            </div>

            <Button asChild size="lg"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black text-base py-6 rounded-full shadow-xl shadow-orange-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden bg-slate-900 border-t border-slate-800 py-28 px-6 text-center">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/6 rounded-full blur-3xl" />
        </div>
        <h2 className="relative text-3xl sm:text-4xl font-black text-white mb-4 leading-tight tracking-tighter">
          行動が変わり、
          <br />
          結果が変わる。
        </h2>
        <p className="relative text-slate-500 text-sm mb-10 max-w-sm mx-auto leading-relaxed">
          自分への問いを深め続けることが、思考の質を変え、選択の質を変え、人生の質を変える。
        </p>
        <Button asChild size="lg"
          className="relative bg-orange-600 hover:bg-orange-500 text-white font-black px-12 py-6 text-base rounded-full shadow-2xl shadow-orange-900/40 transition-all hover:scale-[1.03] active:scale-[0.98]">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-black border-t border-slate-900 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4 text-center">
          <p className="text-base font-black text-slate-200 tracking-tight">Hack Log</p>
          <div className="flex flex-wrap justify-center gap-5 text-xs text-slate-600 font-medium">
            <span className="hover:text-slate-400 transition cursor-pointer">利用規約</span>
            <span className="hover:text-slate-400 transition cursor-pointer">プライバシーポリシー</span>
            <span className="hover:text-slate-400 transition cursor-pointer">特定商取引法に基づく表記</span>
          </div>
          <p className="text-xs text-slate-800">© 2026 Hack Log. All Rights Reserved.</p>
        </div>
      </footer>
    </main>
  );
}
