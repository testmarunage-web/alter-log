import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// Whisper API は最大 25MB。5分音声の変換に最大60秒程度かかるため300秒に設定
// Vercel Pro は最大 300 秒まで対応
export const maxDuration = 300;

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

  const fileSizeMB = (audioFile.size / 1024 / 1024).toFixed(2);
  console.log(`[transcribe] received audio size=${fileSizeMB}MB type=${audioFile.type} name=${audioFile.name}`);

  // Whisper API の上限は 25MB
  const MAX_SIZE_BYTES = 25 * 1024 * 1024;
  if (audioFile.size > MAX_SIZE_BYTES) {
    console.error(`[transcribe] file too large: ${fileSizeMB}MB > 25MB`);
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // Whisper API への転送
  const whisperForm = new FormData();
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

  console.log(`[transcribe] Whisper API response status=${response.status}`);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[transcribe] Whisper API error: status=${response.status} detail=${detail}`);
    return NextResponse.json(
      { error: "Transcription failed", detail },
      { status: 500 }
    );
  }

  const result = await response.json() as { text?: string };
  console.log(`[transcribe] success text_length=${result.text?.length ?? 0}`);
  return NextResponse.json({ text: result.text ?? "" });
}
