import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // vision が空でないユーザーを取得
  const users = await prisma.user.findMany({
    where: { vision: { not: null } },
    select: { id: true, vision: true },
  });

  console.log(`Found ${users.length} users with vision data`);

  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.vision?.trim()) { skipped++; continue; }

    // 既に visions レコードがあればスキップ
    const existing = await prisma.vision.findFirst({ where: { userId: user.id } });
    if (existing) {
      console.log(`  skip userId=${user.id} (already has visions)`);
      skipped++;
      continue;
    }

    await prisma.vision.create({
      data: {
        userId: user.id,
        label: "マイビジョン",
        content: user.vision.trim(),
        sortOrder: 0,
      },
    });
    migrated++;
    console.log(`  migrated userId=${user.id}`);
  }

  console.log(`Done: migrated=${migrated} skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
