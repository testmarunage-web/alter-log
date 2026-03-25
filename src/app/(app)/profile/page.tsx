import Link from "next/link";
import { ProfileAccordion } from "./_components/ProfileAccordion";

const accordionItems = [
  {
    title: "強み・勝ち筋",
    catchphrase: "問題の「枠組み」を自分で再設定できる人",
    detail:
      "複雑な状況を即座に構造化し、本質的な問いを見出す力があります。不確実な環境でも臆せず行動に移せるのは、リスクを感情ではなく理性で受け入れる準備ができているからでしょう。対話の中で「問題の枠組み」を自ら再設定する場面が何度も見られました。これはあなたの大きな武器です。",
    accent: "border-[#183D46]/12 bg-[rgba(24,61,70,0.025)]",
    labelColor: "text-[#183D46]/60",
  },
  {
    title: "思考のクセ",
    catchphrase: "完璧でないと、動けなくなる",
    detail:
      "「完璧でなければ始められない」という感覚が、着手を遅らせることがあります。外部の要因や他者の動きを待ってしまう瞬間は、実は自分の中にまだ不確かさがある時のサインかもしれません。短期的な感情の揺れが、本来の優先順位を塗り替えてしまうパターンも繰り返し現れています。",
    accent: "border-amber-200/60 bg-amber-50/40",
    labelColor: "text-amber-600",
  },
  {
    title: "価値観",
    catchphrase: "自分で選んだ道しか、本気になれない",
    detail:
      "「自分の意思で決めた」という感覚を、あなたはひどく大切にしています。誰かに言われてやった仕事より、自ら選んだ道を歩んでいる時に、あなたのエネルギーは最も高まります。成果そのものよりも、そこに至るプロセスで何を学んだかを問い続ける姿勢は、揺るぎないあなたの軸です。",
    accent: "border-sky-200/60 bg-sky-50/40",
    labelColor: "text-sky-600",
  },
  {
    title: "現在の主な課題",
    catchphrase: "「速く」と「正しく」の間で揺れている",
    detail:
      "意思決定の速度と質のトレードオフに、あなたは今も向き合っています。マネジメントという新しい役割への移行期において、これまで通用してきた「一人で解決する」という方法論が、少しずつ限界を見せ始めています。長期の自分像を言葉にすることが、今最も必要な作業かもしれません。",
    accent: "border-rose-200/60 bg-rose-50/40",
    labelColor: "text-rose-600",
  },
];

export default function ProfilePage() {
  return (
    <div className="p-4 md:p-6 min-h-full">
      <div className="max-w-2xl">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-[#171717]">あなたの取扱説明書</h1>
          <p className="text-sm text-[#9A9A9A] mt-0.5">対話から読み解いた、あなたの内面の地図</p>
        </div>

        {/* Accordion */}
        <ProfileAccordion items={accordionItems} />

        {/* Your Coach */}
        <div className="mt-4 bg-white border border-[#E8E8E8] rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#183D46] flex items-center justify-center text-xl flex-shrink-0">
              🪞
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-[#183D46]/50 uppercase mb-1">
                現在のあなたの専属コーチ
              </p>
              <p className="text-sm text-[#5C5C5C] leading-relaxed">
                ロジカルに、でも絶対にあなたの味方として伴走します。答えを出すのではなく、あなた自身が答えを見つけるための問いを届けます。
              </p>
            </div>
          </div>
        </div>

        {/* Change coach */}
        <div className="mt-3">
          <Link
            href="/onboarding"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#E8E8E8] bg-white text-sm font-semibold text-[#5C5C5C] hover:border-[#183D46]/30 hover:text-[#183D46] transition-colors shadow-sm"
          >
            コーチを変更する
          </Link>
        </div>

      </div>
    </div>
  );
}
