import { prisma } from "@/lib/prisma";

/** ユーザーの全ビジョンを取得してプロンプト用テキストブロックを構築する */
export async function buildVisionBlock(userId: string, style: "scan" | "daily" | "weekly" = "daily"): Promise<string> {
  const visions = await prisma.vision.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
    select: { label: true, content: true },
  });

  const nonEmpty = visions.filter((v) => v.content.trim());
  if (nonEmpty.length === 0) return "";

  const visionText = nonEmpty
    .map((v) => `[${v.label}] ${v.content.trim()}`)
    .join("\n");

  if (style === "scan") {
    return `\n\n【参考情報：ユーザーのビジョン・目標】\n以下はこのユーザー自身が入力した価値観・目標です。ジャーナルの分析において、このビジョンとの関連性や一致・乖離があれば積極的に言及してください。ただし、主たる分析対象はジャーナルの内容です。\n${visionText}`;
  }

  if (style === "weekly") {
    return nonEmpty.map((v) => `[${v.label}] ${v.content.trim()}`).join("\n");
  }

  // daily (default)
  return `\n\n【参考情報】\n以下はこのユーザー自身が入力した価値観・目標である。観察の補助的参考情報として使用すること。ただし分析の主体はジャーナルの内容であり、visionはあくまで参考に留めること。\n${visionText}`;
}
