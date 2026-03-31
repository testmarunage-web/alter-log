import Link from "next/link";
import { AlterIcon } from "@/app/(app)/_components/AlterIcon";

export default function TokushohoPage() {
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
        <h1 className="text-2xl font-black text-[#C4A35A] mb-2 tracking-tight">特定商取引法に基づく表記</h1>
        <p className="text-xs text-[#8A8276] mb-12">最終更新日：2026年3月31日</p>

        <div className="space-y-0 text-sm">
          {[
            ["販売業者", "株式会社シュババ"],
            ["運営責任者", "請求があれば遅滞なく開示いたします"],
            ["所在地", "〒107-0062 東京都港区南青山2-2-15 ウィン青山942"],
            ["お問い合わせ", "Email: support@alter-log.com"],
            ["サービス名称", "Alter Log"],
            ["サービス内容", "AIを活用した思考分析・内省支援サブスクリプションサービス"],
            ["販売価格", "月額2,980円（税込）※期間限定で初月10%OFF（2,682円）のキャンペーンを実施する場合があります"],
            ["支払い方法", "クレジットカード決済（Visa / Mastercard / American Express / JCB）"],
            ["支払い時期", "お申し込み時に初回課金。以降、お申し込み日を起算日として毎月同日に自動課金されます"],
            ["サービス提供時期", "お申し込み・決済完了後、直ちにご利用いただけます"],
            ["解約・キャンセルについて", "いつでも解約可能です。解約後は、現在の請求期間の終了日まで引き続きご利用いただけます。終了日以降の課金は発生しません。"],
            ["返金ポリシー", "お申し込みから7日以内にご満足いただけない場合、理由を問わず全額返金いたします。返金をご希望の場合は、カスタマーサポートまでご連絡ください。"],
            ["動作環境", "推奨ブラウザ：Google Chrome / Safari / Firefox / Microsoft Edge（いずれも最新版）。スマートフォン：iOS 16以上 / Android 12以上推奨。"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col sm:flex-row border-b border-white/[0.06] py-5 gap-1 sm:gap-8">
              <dt className="font-medium text-[#E8E3D8] sm:w-48 flex-shrink-0">{label}</dt>
              <dd className="text-[#8A8276] sm:flex-1">{value}</dd>
            </div>
          ))}
        </div>
      </div>

      {/* フッター */}
      <footer className="border-t border-white/[0.04] py-8 px-6 mt-8">
        <p className="text-center text-xs text-[#8A8276]/30">© 2026 Alter Log. All Rights Reserved.</p>
      </footer>
    </main>
  );
}
