import { z } from "zod";

export const alterLogSchema = z.object({
  alter_notice: z.string().describe(
    "直近の対話から気づいたユーザーの無意識のパターンや口癖についての一言メッセージ（例: 「ここ数日の対話で〜すべきという言葉が15回登場しています...」）"
  ),
  thinking_type: z.string().describe(
    "対話から推測されるユーザーの現在の思考タイプを2〜5文字で表現（例: 完璧を求める開拓者）"
  ),
  balance: z.array(z.object({
    left: z.string().describe("軸の左側ラベル（例: 内省）"),
    right: z.string().describe("軸の右側ラベル（例: 発信）"),
    pct: z.number().min(0).max(100).describe("0=完全に左、100=完全に右 のスコア"),
  })).length(5).describe("思考のバランスを表す5軸のスライダーデータ"),
  mind_share: z.array(z.object({
    label: z.string().describe("脳内を占めているトピック"),
    pct: z.number().describe("占有率（5項目合計が100になるように）"),
    color: z.string().describe("HEXカラーコード（#7A9E8E, #C4A35A, #8A7A5A, #4A5A54, #2A3A34 から選択）"),
  })).length(5).describe("脳内シェアを表す5つのトピックとその割合"),
  subtraction_title: z.string().describe("今週の引き算セクションで白太字でハイライトするアクション名（例: 新しいAIツールの検証）"),
  subtraction_detail: z.string().describe("今週の引き算の詳細解説テキスト（100〜150字程度）"),
  organize_title: z.string().describe("頭のモヤモヤ整理セクションで強調するフレーズ（例: 緊急だが重要ではない）"),
  organize_detail: z.string().describe("頭のモヤモヤ整理の詳細解説テキスト（100〜150字程度）"),
  book_title: z.string().describe("おすすめ書籍のタイトル（例: HIGH OUTPUT MANAGEMENT）"),
  book_author: z.string().describe("著者名（例: アンドリュー・S・グローブ）"),
  book_reason: z.string().describe("この本を勧める理由（50〜80字程度）"),
  win_pattern_title: z.string().describe("あなたの勝ちパターンで強調するキーフレーズ（例: 小さくテストする）"),
  win_pattern_detail: z.string().describe("勝ちパターンの詳細解説テキスト（100〜150字程度）"),
});

export type AlterLogInsights = z.infer<typeof alterLogSchema>;
