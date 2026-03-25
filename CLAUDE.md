# Hack Log 開発ルール（AIとの契約書）

## プロジェクト概要
行動変容を促すジャーナリングAIアプリ「Hack Log」。
Next.js(App Router) + Prisma + Clerk + Vercel で構成されている。

## 🚨 【最重要】絶対に破ってはいけないルール（地雷マップ）

1. **Vercelのビルドを壊すな**
   - Vercelでのデプロイを前提としているため、TypeScriptの型エラーやESLintの警告を残したままコミットしないこと。
   - `next.config.ts` を修正する際は、Next.jsの最新バージョンの仕様に厳密に従うこと（古いオプションは使わない）。

2. **データベース（Prisma）の扱い**
   - スキーマ（`schema.prisma`）を変更した後は、必ず `npx prisma generate` と `npx prisma db push`（またはmigrate）を行うこと。
   - Vercelデプロイ用に、`package.json` の `postinstall` スクリプトで Prisma Client が生成される状態を維持すること。

3. **UI/UXの原則**
   - ユーザーが「毎日開きたくなる」シンプルで高速なダッシュボードを目指す。
   - 複雑な設定画面より、直感的に操作できるワンアクションを優先する。

## 🛠 デバッグ・開発手順
- エラーが発生した際は、勝手に推測して修正するのではなく、必ずエラーログ全体を解析してから修正案を提示・実行すること。
- コードを変更した後は、ローカル環境（`npm run dev`）で画面が壊れていないか確認する手順を踏むこと。