import Link from "next/link";
import { ProfileAccordion } from "./_components/ProfileAccordion";

const accordionItems = [
  {
    title: "強み・勝ち筋",
    catchphrase: "問題の「枠組み」を自分で再設定できる人",
    detail:
      "複雑な状況を即座に構造化し、本質的な問いを見出す力があります。不確実な環境でも臆せず行動に移せるのは、リスクを感情ではなく理性で受け入れる準備ができているからでしょう。対話の中で「問題の枠組み」を自ら再設定する場面が何度も見られました。これはあなたの大きな武器です。",
    accent: "border-[#3AAFCA]/30 bg-[#3AAFCA]/5",
    labelColor: "text-[#3AAFCA]",
  },
  {
    title: "思考のクセ",
    catchphrase: "完璧でないと、動けなくなる",
    detail:
      "「完璧でなければ始められない」という感覚が、着手を遅らせることがあります。外部の要因や他者の動きを待ってしまう瞬間は、実は自分の中にまだ不確かさがある時のサインかもしれません。短期的な感情の揺れが、本来の優先順位を塗り替えてしまうパターンも繰り返し現れています。",
    accent: "border-[#C4A35A]/30 bg-[#C4A35A]/5",
    labelColor: "text-[#C4A35A]",
  },
  {
    title: "価値観",
    catchphrase: "自分で選んだ道しか、本気になれない",
    detail:
      "「自分の意思で決めた」という感覚を、あなたはひどく大切にしています。誰かに言われてやった仕事より、自ら選んだ道を歩んでいる時に、あなたのエネルギーは最も高まります。成果そのものよりも、そこに至るプロセスで何を学んだかを問い続ける姿勢は、揺るぎないあなたの軸です。",
    accent: "border-[#5A8A96]/30 bg-[#5A8A96]/5",
    labelColor: "text-[#5A8A96]",
  },
  {
    title: "現在の主な課題",
    catchphrase: "「速く」と「正しく」の間で揺れている",
    detail:
      "意思決定の速度と質のトレードオフに、あなたは今も向き合っています。マネジメントという新しい役割への移行期において、これまで通用してきた「一人で解決する」という方法論が、少しずつ限界を見せ始めています。長期の自分像を言葉にすることが、今最も必要な作業かもしれません。",
    accent: "border-[#9A9488]/30 bg-[#9A9488]/5",
    labelColor: "text-[#9A9488]",
  },
];

export default function ProfilePage() {
  return (
    <div className="p-4 md:p-6 min-h-full bg-[#0B0E13]">
      <div className="max-w-2xl">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-[#E8E3D8]">あなたの取扱説明書</h1>
          <p className="text-sm text-[#8A8276] mt-0.5">対話から読み解いた、あなたの内面の地図</p>
        </div>

        {/* Accordion */}
        <ProfileAccordion items={accordionItems} />

        {/* Alter section */}
        <div className="mt-4 bg-white/[0.04] backdrop-blur-sm border border-[#C4A35A]/20 rounded-2xl p-5">
          <div className="flex items-start gap-3.5">
            <div
              className="w-10 h-10 rounded-full flex-shrink-0"
              style={{
                background: "radial-gradient(circle at 38% 38%, #93E4D4, #3AAFCA 45%, #1A6B8A)",
                boxShadow: "0 0 14px rgba(58,175,202,0.45)",
              }}
            />
            <div>
              <p className="text-xs font-bold tracking-widest text-[#C4A35A]/75 uppercase mb-1">
                あなたと同期する Alter
              </p>
              <p className="text-sm text-[#9A9488] leading-relaxed">
                あなたの過去の文脈を100%記憶し、伴走します。答えを出すのではなく、あなた自身が本質に気づくための鏡となります。
              </p>
            </div>
          </div>
        </div>

        {/* Reset Alter */}
        <div className="mt-3">
          <Link
            href="/onboarding"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-[#C4A35A]/20 text-sm font-semibold text-[#C4A35A]/70 hover:text-[#C4A35A] transition-colors"
          >
            Alter を再設定する
          </Link>
        </div>

      </div>
    </div>
  );
}
