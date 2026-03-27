/**
 * テストデータ一括削除スクリプト
 * 実行: npx tsx scripts/reset-test-data.ts
 *
 * ジャーナル・壁打ち・セッション・AlterLogの全データを削除し、
 * クリーンな状態でのテストを可能にします。
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("⚠️  テストデータ削除を開始します...\n");

  // 削除前カウント
  const [journalCount, coachCount, sessionCount, alterLogCount] = await Promise.all([
    prisma.journalEntry.count(),
    prisma.coachMessage.count(),
    prisma.session.count(),
    prisma.alterLog.count(),
  ]);

  console.log("削除対象:");
  console.log(`  JournalEntry   : ${journalCount} 件`);
  console.log(`  CoachMessage   : ${coachCount} 件`);
  console.log(`  Session (→Message cascade) : ${sessionCount} 件`);
  console.log(`  AlterLog       : ${alterLogCount} 件\n`);

  // 削除実行（外部キー制約に配慮した順序）
  const [j, c, a] = await Promise.all([
    prisma.journalEntry.deleteMany({}),
    prisma.coachMessage.deleteMany({}),
    prisma.alterLog.deleteMany({}),
  ]);

  // Session は Message を cascade delete するので最後
  const ss = await prisma.session.deleteMany({});

  console.log("✅ 削除完了:");
  console.log(`  JournalEntry : ${j.count} 件削除`);
  console.log(`  CoachMessage : ${c.count} 件削除`);
  console.log(`  AlterLog     : ${a.count} 件削除`);
  console.log(`  Session+Message : ${ss.count} セッション削除（Message は cascade）`);
  console.log("\n🎉 データベースがクリーンな状態になりました。");
}

main()
  .catch((e) => {
    console.error("❌ エラー:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
