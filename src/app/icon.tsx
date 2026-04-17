import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#0B0E13",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="360" height="360" viewBox="0 0 512 512">
          <path d="M356,83 A200,200 0 1,0 456,256 L356,83 Z" fill="#C4A35A" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
