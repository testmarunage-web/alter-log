import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// 音声ファイルは最大 25MB（Whisper API 上限）
export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("[transcribe] OPENAI_API_KEY is not set");
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audioFile = formData.get("audio") as File | null;
  if (!audioFile || audioFile.size === 0) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 });
  }

  // Whisper API への転送
  const whisperForm = new FormData();
  // ファイル名の拡張子でフォーマットを判別させる
  const ext = audioFile.type.includes("mp4") ? "mp4" : "webm";
  whisperForm.append("file", audioFile, `audio.${ext}`);
  whisperForm.append("model", "whisper-1");
  whisperForm.append("language", "ja");

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: whisperForm,
    });
  } catch (err) {
    console.error("[transcribe] Whisper API fetch failed:", err);
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[transcribe] Whisper API error:", response.status, detail);
    return NextResponse.json(
      { error: "Transcription failed", detail },
      { status: 500 }
    );
  }

  const result = await response.json() as { text?: string };
  return NextResponse.json({ text: result.text ?? "" });
}
