export default function AppLoading() {
  return (
    <div className="min-h-[100dvh] bg-[#0B0E13] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-full relative overflow-hidden animate-pulse"
          style={{
            background: "radial-gradient(circle at 38% 38%, #93E4D4, #3AAFCA 45%, #1A6B8A)",
            boxShadow: "0 0 20px rgba(58, 175, 202, 0.5)",
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at 62% 28%, rgba(255,255,255,0.42), transparent 58%)",
            }}
          />
        </div>
        <p className="text-xs text-[#8A8276]/60 tracking-widest">読み込み中...</p>
      </div>
    </div>
  );
}
