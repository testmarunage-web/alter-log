import Link from "next/link";
import { AlterIcon } from "@/app/(app)/_components/AlterIcon";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0B0E13] text-[#E8E3D8]">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0B0E13]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlterIcon size={18} />
            <span className="text-sm font-black tracking-tight text-[#E8D5A0]">Alter Log</span>
          </div>
          <Link href="/" className="text-xs text-[#8A8276] hover:text-[#E8E3D8] transition-colors">
            ← トップに戻る
          </Link>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-black text-[#C4A35A] mb-2 tracking-tight">利用規約</h1>
        <p className="text-xs text-[#8A8276] mb-12">最終更新日：2026年3月31日</p>

        <div className="space-y-10 text-sm text-[#8A8276] leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第1条（適用）</h2>
            <p>本利用規約（以下「本規約」）は、Alter Log（以下「当サービス」）の利用条件を定めるものです。ユーザーの皆さまは、本規約に同意のうえ、当サービスをご利用ください。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第2条（利用登録）</h2>
            <p>登録希望者が本規約に同意のうえ、所定の方法で利用登録を申請し、運営者がこれを承認することによって、利用登録が完了します。運営者は、以下の場合に利用登録を拒否することがあります。</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 pl-2">
              <li>虚偽の事項を届け出た場合</li>
              <li>本規約に違反したことがある者からの申請である場合</li>
              <li>13歳未満の方で保護者の同意がない場合</li>
              <li>その他、運営者が利用登録を相当でないと判断した場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第3条（料金および支払い）</h2>
            <p>当サービスの利用には、所定の月額料金が発生します。料金の支払いは、クレジットカード決済（Stripe）により行われます。月額料金は自動更新されます。解約しない限り、毎月自動的に課金されます。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第4条（解約・返金）</h2>
            <p>ユーザーはいつでも解約することができます。解約後は、その月の末日まで引き続きサービスをご利用いただけます。お申し込みから7日以内にご満足いただけない場合は、理由を問わず全額返金いたします。返金ご希望の場合は、カスタマーサポートまでご連絡ください。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第5条（禁止事項）</h2>
            <p>ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません。</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 pl-2">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当サービスのサーバーまたはネットワークの機能を破壊・妨害する行為</li>
              <li>当サービスの運営を妨害するおそれのある行為</li>
              <li>他のユーザーまたは第三者の個人情報を収集・蓄積する行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>当サービスのコンテンツを無断で複製・転用・販売する行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第6条（サービスの提供の停止等）</h2>
            <p>運営者は、以下の場合に、事前の通知なくサービスの全部または一部の提供を停止または中断することができます。</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 pl-2">
              <li>サービスにかかるシステムの保守点検・更新を行う場合</li>
              <li>地震・落雷・火災・停電などの不可抗力により、サービスの提供が困難な場合</li>
              <li>その他、運営者がサービスの提供が困難と判断した場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第7条（免責事項）</h2>
            <p>当サービスは、AIによる思考分析・内省支援を目的としたサービスです。医療的診断・治療・精神的ケアの代替となるものではありません。当サービスの提供するコンテンツに基づいてユーザーが行った行動の結果について、運営者は一切の責任を負いません。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第8条（サービス内容の変更等）</h2>
            <p>運営者は、ユーザーに通知することなく、当サービスの内容を変更し、または当サービスの提供を中止することができます。これによりユーザーに生じた損害について、運営者は一切の責任を負いません。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第9条（利用規約の変更）</h2>
            <p>運営者は、必要と判断した場合には、ユーザーへの通知なく本規約を変更することができます。変更後の利用規約は、当サービス上に掲示した時点で効力を生じるものとします。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第10条（準拠法・裁判管轄）</h2>
            <p>本規約の解釈にあたっては、日本法を準拠法とします。当サービスに関して紛争が生じた場合には、運営者の所在地を管轄する裁判所を専属的合意管轄とします。</p>
          </section>

        </div>
      </div>

      {/* フッター */}
      <footer className="border-t border-white/[0.04] py-8 px-6 mt-8">
        <p className="text-center text-xs text-[#8A8276]/30">© 2026 Alter Log. All Rights Reserved.</p>
      </footer>
    </main>
  );
}
