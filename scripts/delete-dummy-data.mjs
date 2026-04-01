import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const USER_ID = "cmnb02ny8000n5c5uyabc3p80"; // inquiry.desk0302@gmail.com

// 削除範囲: 2026-03-02〜2026-03-29 (JST)
const rangeStart = new Date("2026-03-02T00:00:00+09:00");
const rangeEnd   = new Date("2026-03-29T23:59:59+09:00");

async function main() {
  // JournalEntry: createdAt が範囲内のものを削除
  const deletedJournals = await prisma.journalEntry.deleteMany({
    where: {
      userId: USER_ID,
      createdAt: { gte: rangeStart, lte: rangeEnd },
    },
  });

  // AlterLog: date が範囲内のものを削除
  const deletedAlterLogs = await prisma.alterLog.deleteMany({
    where: {
      userId: USER_ID,
      date: { gte: rangeStart, lte: rangeEnd },
    },
  });

  console.log(`削除完了:`);
  console.log(`  JournalEntry: ${deletedJournals.count} 件`);
  console.log(`  AlterLog:     ${deletedAlterLogs.count} 件`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
