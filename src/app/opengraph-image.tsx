import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Alter Log | 究極の客観視で、自分を知る。";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadJaFont(): Promise<ArrayBuffer | null> {
  try {
    // Noto Sans JP Bold のサブセット（使用文字のみ）を Google Fonts から取得
    const text = encodeURIComponent("究極の客観視で、自分を知る。Alter Log");
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${text}&display=swap`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } }
    ).then((r) => r.text());
    const url = css.match(/url\((.+?)\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function Image() {
  const fontData = await loadJaFont();

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0B0E13",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Noto Sans JP, sans-serif",
          position: "relative",
        }}
      >
        {/* 背景グロー */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "800px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(196,163,90,0.07) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Alterアイコン（右下） */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 20 20"
          fill="none"
          style={{ position: "absolute", bottom: "56px", right: "72px", opacity: 0.18 }}
        >
          <path d="M14,3 A8,8 0 1,0 18,10 L14,3 Z" fill="#C4A35A" />
        </svg>

        {/* メインタイトル */}
        <div
          style={{
            color: "#C4A35A",
            fontSize: "116px",
            fontWeight: 700,
            letterSpacing: "-4px",
            lineHeight: 1,
            marginBottom: "32px",
          }}
        >
          Alter Log
        </div>

        {/* サブテキスト */}
        <div
          style={{
            color: "#E8E3D8",
            fontSize: "40px",
            fontWeight: 700,
            letterSpacing: "4px",
            opacity: 0.82,
          }}
        >
          究極の客観視で、自分を知る。
        </div>
      </div>
    ),
    {
      ...size,
      ...(fontData
        ? { fonts: [{ name: "Noto Sans JP", data: fontData, style: "normal" as const, weight: 700 }] }
        : {}),
    }
  );
}
