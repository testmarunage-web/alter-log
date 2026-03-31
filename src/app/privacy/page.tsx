import Link from "next/link";
import { AlterIcon } from "@/app/page";

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-black text-[#C4A35A] mb-2 tracking-tight">プライバシーポリシー</h1>
        <p className="text-xs text-[#8A8276] mb-12">最終更新日：2026年3月31日</p>

        <div className="space-y-10 text-sm text-[#8A8276] leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">はじめに</h2>
            <p>Alter Log（以下「当サービス」）は、ユーザーの皆さまの個人情報の保護を重要事項と考え、以下のプライバシーポリシーに従って適切に取り扱います。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">年齢制限</h2>
            <p>本サービスは13歳以上の方を対象としています。13歳未満の方は保護者の同意なく本サービスを利用することはできません。13歳未満の方の個人情報を故意に収集することはありません。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">収集する情報</h2>
            <p>当サービスでは、以下の情報を収集します。</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 pl-2">
              <li>アカウント情報（メールアドレス、表示名）</li>
              <li>ジャーナルの入力内容（テキスト）</li>
              <li>AIとの対話履歴（壁打ち・コーチングセッション）</li>
              <li>サービス利用状況（ログイン日時、利用回数等）</li>
              <li>決済情報（Stripeを経由して処理され、カード番号等の機密情報は当サービスに保存されません）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">情報の利用目的</h2>
            <p>収集した情報は、以下の目的のために使用します。</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 pl-2">
              <li>サービスの提供・改善・パーソナライズ</li>
              <li>AIによる思考分析・内省支援機能の提供</li>
              <li>本人確認および不正利用の防止</li>
              <li>お問い合わせへの対応</li>
              <li>利用規約への違反調査</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">第三者への提供</h2>
            <p>当サービスは、以下の場合を除いて、ユーザーの個人情報を第三者に提供しません。</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 pl-2">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命・身体・財産の保護に必要な場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">利用する外部サービス</h2>
            <p>当サービスは、以下の外部サービスを利用しています。各サービスのプライバシーポリシーも合わせてご確認ください。</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 pl-2">
              <li>Clerk（認証・アカウント管理）</li>
              <li>Stripe（決済処理）</li>
              <li>Anthropic Claude（AI分析処理）— 入力内容はAIの処理に使用されます</li>
              <li>Vercel（ホスティング）</li>
              <li>Neon（データベース）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">データの保管と削除</h2>
            <p>ユーザーの入力データはサービス提供のために保管されます。アカウントを削除する場合は、カスタマーサポートまでご連絡ください。関連するデータを適切に削除いたします。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">セキュリティ</h2>
            <p>当サービスは、ユーザーの個人情報の紛失・破壊・改ざん・漏洩等を防止するために、適切なセキュリティ対策を実施します。ただし、インターネット上のいかなる送信方法または電子ストレージ方法も100%安全ではありません。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">プライバシーポリシーの変更</h2>
            <p>当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。変更後のポリシーは、当サービス上に掲示した時点で効力を生じます。重要な変更については、登録メールアドレスに通知することがあります。</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#E8E3D8] mb-3">お問い合わせ</h2>
            <p>本プライバシーポリシーに関するご質問・ご意見は、サービス内のお問い合わせフォームよりご連絡ください。</p>
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
