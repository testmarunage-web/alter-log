import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ① 即時スナップショット層（直近の入力テキストの構造解析）
// ② 蓄積プロファイル層（過去ログ全体からのパターン抽出）
// ─────────────────────────────────────────────────────────────────────────────
export const alterLogSchema = z.object({
  is_insufficient_data: z.boolean().describe(
    "入力されたジャーナルや壁打ちが『テスト1』などの無意味な文字列、または極端に短く情報量が足りない場合は必ず true にすること。十分な情報がある場合は false。"
  ),

  // ── ① 即時スナップショット ──────────────────────────────────────────────
  fact_emotion_ratio: z.object({
    fact_percentage: z.number().min(0).max(100).describe(
      "入力テキスト全体に占める事実・論理的記述の割合（0〜100）"
    ),
    emotion_percentage: z.number().min(0).max(100).describe(
      "入力テキスト全体に占める感情・主観的記述の割合（0〜100）。fact_percentage + emotion_percentage = 100 になること"
    ),
    analysis: z.string().describe(
      "この比率が示す現在のコンディションへの客観的な指摘（1〜2文。感情的な寄り添いは厳禁）"
    ),
  }).describe("直近の入力における事実と感情の比率分析"),

  cognitive_bias_detected: z.object({
    bias_name: z.string().describe(
      "検出された認知バイアスの名称（例: 二項対立の罠、コントロール感の喪失、サンクコストの呪縛、過般化、承認欲求の漏出）"
    ),
    description: z.string().describe(
      "そのバイアスがログのどの具体的な表現・構文に現れているかの指摘（2〜3文。推測ではなく、テキストの根拠を必ず示すこと）"
    ),
  }).describe("入力テキストから検出された最も顕著な認知バイアス"),

  passive_voice_status: z.string().describe(
    "自発的アクションの有無、受け身・他責傾向の構文的指摘。「〜された」「〜してもらえない」「〜になってしまう」等の受動・自動詞構造の頻度と、それが示す心理的状態を端的に記述（1〜2文）"
  ),

  // ── ② 蓄積プロファイル ──────────────────────────────────────────────────
  observed_loops: z.string().nullable().describe(
    "過去ログ全体から観測された反復する思考ループのパターン（例: 「意思決定の直前で情報収集に戻る」「課題を人間関係に帰属させる」）。データが少なく判断できない場合は必ず null を返すこと"
  ),
  blind_spots: z.string().nullable().describe(
    "過去ログ全体から推測される、無意識に話題を回避している領域（例: 「コスト・収益への言及が皆無」「身体的コンディションへの無関心」）。データが少なく判断できない場合は必ず null を返すこと"
  ),
  pending_decisions: z.string().nullable().describe(
    "過去ログ全体から抽出された、明確な結論が出ずに保留されている意思決定の箇条書き。データが少なく判断できない場合は必ず null を返すこと"
  ),
});

export type AlterLogInsights = z.infer<typeof alterLogSchema>;
