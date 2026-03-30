"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export type JournalMood = "negative" | "uncertain" | "neutral";

export async function classifyJournalMood(content: string): Promise<JournalMood> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5"),
      system: `あなたはテキスト分類器である。与えられたジャーナルテキストの感情傾向を、以下の3つのうち1語だけで返せ。それ以外は一切出力するな。

- negative：苦しみ・怒り・疲弊・不安・自己否定など負の感情が主である場合
- uncertain：迷い・葛藤・未整理のモヤモヤ・判断の保留が主である場合
- neutral：事実報告・淡々とした記述・ポジティブな内容が主である場合`,
      prompt: content,
      maxTokens: 10,
    });

    const result = text.trim().toLowerCase();
    if (result.includes("negative")) return "negative";
    if (result.includes("uncertain")) return "uncertain";
    return "neutral";
  } catch (err) {
    console.error("[classifyJournalMood] failed:", err);
    return "neutral";
  }
}
