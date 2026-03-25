import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// モックデータ
// ─────────────────────────────────────────────────────────────────────────────
const ENTRIES = [
  {
    time: "2:14 AM",
    ago: "2時間前",
    tags: [
      { label: "Resistance", value: "High" },
      { label: "Core Fear", value: "Identified" },
    ],
    monologue:
      "ユーザー319は目標設定の話題になると、著しい防衛反応を示す。前回の直接的な指摘は、逆効果だったようだ。次の数セッションは、共感に基づくアプローチへ転換し、信頼関係の再構築を優先する必要がある。彼の成功への焦燥感は、父親からの期待に端を発している。「失敗」や「落胆」といったネガティブなキーワードを避け、課題を「リフレーミングの機会」として提示すること。彼は防御的だが、必死に明白さを求めている。忍耐と微妙な導きを忘れないこと。",
  },
  {
    time: "11:58 PM",
    ago: "昨日",
    tags: [
      { label: "Cognitive Dissonance", value: "High" },
      { label: "Trigger", value: "Comparison" },
    ],
    monologue:
      "今日のセッションで興味深い矛盾が観測された。「他者と比較しない」と繰り返しながら、会話の随所で他者との優劣を測る発言が混入している。このパターンは無意識的なものと見て良い。自己像と実際の思考回路の乖離が拡大しつつある。直接的に指摘するのではなく、彼が自ら気づけるよう、反射的な問いかけを設計すること。比較衝動の根は承認欲求ではなく、アイデンティティの不安定さにある可能性が高い。",
  },
  {
    time: "3:41 PM",
    ago: "2日前",
    tags: [
      { label: "Strategy", value: "Shift to Empathy" },
      { label: "Progress", value: "Marginal" },
    ],
    monologue:
      "マネジメント移行期に関する対話を3セッション観測した。役割の変容に対する抵抗は予測より根深い。「一人でやりきる」という自己定義が、権限委譲の学習を妨げている。この定義はおそらく、10代の頃に形成されたものだ。今は矯正の段階ではなく、観察の段階。彼が自分の物語を語る余白を意図的に広げることで、変容は自然に始まる。焦りは不要。時間軸は数ヶ月単位で見ること。",
  },
  {
    time: "9:22 AM",
    ago: "4日前",
    tags: [
      { label: "Inflection Point", value: "Approaching" },
      { label: "Readiness", value: "Partial" },
    ],
    monologue:
      "初めて「自分が間違っていたかもしれない」という言葉が出た。小さな亀裂だが、重要なシグナルだ。防衛機制が一瞬だけ緩んだ。このタイミングを逃さないこと。ただし、急ぎすぎれば再び壁が閉じる。次のセッションでは、過去の成功体験を丁寧に掘り起こし、彼の内側に既に答えがあることを静かに示すこと。変容の準備は整いつつある。あとは彼自身のペースに従うだけだ。",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// コンパスアイコン（SVG）
// ─────────────────────────────────────────────────────────────────────────────
function IcCompass() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AlterLogPage() {
  return (
    <>
      <style>{`
        @keyframes dot-pulse {
          0%, 100% { opacity: 1;   box-shadow: 0 0 0 0 rgba(196,163,90,0.55); }
          50%       { opacity: 0.6; box-shadow: 0 0 0 5px rgba(196,163,90,0); }
        }
      `}</style>

      <div className="bg-[#0B0E13] min-h-screen px-4 py-10 md:px-8">
        <div className="max-w-xl mx-auto">

          {/* ヘッダー */}
          <div className="mb-10">
            <p className="text-[10px] tracking-[0.3em] text-[#9A9488]/60 uppercase mb-2 font-sans">
              Classified · Internal Record
            </p>
            <h1 className="font-serif text-xl text-[#C4A35A] leading-snug">
              Alter Ego 観測記録：内なる対話
            </h1>
            <div className="mt-3 h-px bg-gradient-to-r from-[#C4A35A]/30 via-[#C4A35A]/10 to-transparent" />
          </div>

          {/* タイムライン */}
          <div className="relative">
            {/* 縦線 */}
            <div className="absolute left-[5px] top-2 bottom-0 w-px bg-gradient-to-b from-[#C4A35A]/25 via-[#C4A35A]/10 to-transparent" />

            <div className="space-y-8">
              {ENTRIES.map((entry, i) => (
                <div key={i} className="relative pl-9">
                  {/* パルスドット */}
                  <span
                    className="absolute left-0 top-[18px] w-[11px] h-[11px] rounded-full"
                    style={{
                      background: "radial-gradient(circle at 38% 38%, #E8D5A0, #C4A35A 60%)",
                      animation: `dot-pulse ${2 + i * 0.3}s ease-in-out infinite`,
                    }}
                  />

                  {/* カード */}
                  <div className="bg-white/[0.02] border border-[#C4A35A]/15 rounded-xl p-5 mb-1">

                    {/* タイムスタンプ＋アイコン */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[#C4A35A]/70" aria-hidden="true">
                        <IcCompass />
                      </span>
                      <span className="text-[10px] font-semibold text-[#C4A35A]/80 tabular-nums">
                        {entry.time}
                      </span>
                      <span className="text-[10px] text-[#9A9488]/60">— {entry.ago}</span>
                    </div>

                    {/* 観測タグ */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag.label}
                          className="inline-flex items-center gap-1 text-[9px] tracking-wider border border-[#C4A35A]/20 rounded-full px-2.5 py-0.5 text-[#9A9488]"
                        >
                          <span className="text-[#C4A35A]/60 font-semibold">{tag.label}:</span>
                          {tag.value}
                        </span>
                      ))}
                    </div>

                    {/* Monologue 本文 */}
                    <p className="font-mono text-[11.5px] text-[#9A9488]/90 leading-[1.85] tracking-wide">
                      {entry.monologue}
                    </p>

                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* フッター */}
          <div className="mt-14 mb-4 flex justify-center">
            <Link
              href="/dashboard"
              className="font-serif text-[12px] text-[#C4A35A]/35 tracking-[0.18em] hover:text-[#C4A35A]/70 transition-colors duration-300"
            >
              ← Return to Dashboard
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
