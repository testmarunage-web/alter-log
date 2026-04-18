"use server";

// クライアントから呼び出せる Server Action の薄いラッパー。
// 実処理は generateAlterLog.ts（"use server"なし）内に保持し、
// ブラウザからは本ファイル経由でのみ呼び出せるようにする。
// generateDashboardScan() は内部で auth() を実行するため、認証チェックは二重で担保される。

import { generateDashboardScan as _generateDashboardScan } from "./generateAlterLog";
import type { AlterLogInsights } from "./alterLogSchema";

export async function generateDashboardScan(): Promise<{
  insights: AlterLogInsights;
  thoughtProfile: string | null;
}> {
  return _generateDashboardScan();
}
