export default function AppLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0B0E13]">
      <div
        className="w-10 h-10 rounded-full relative overflow-hidden animate-pulse"
        style={{
          background: "radial-gradient(circle at 38% 38%, #E8E3D8, #C4A35A 45%, #8A8276)",
          boxShadow: "0 0 20px rgba(196, 163, 90, 0.5)",
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 62% 28%, rgba(255,255,255,0.42), transparent 58%)",
          }}
        />
      </div>
      <p className="mt-4 text-xs text-[#8A8276]/60 tracking-widest">Now loading...</p>
    </div>
  );
}
