import { Sidebar } from "./_components/Sidebar";
import { BottomNav } from "./_components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      {/* PC: 左サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* スマホ: ボトムナビ */}
      <BottomNav />
    </div>
  );
}
