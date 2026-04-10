import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
// Whisper 変換が必要な場合に備えて60秒確保
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id: bookId } = await params;
  const contentType = req.headers.get("content-type") ?? "";

  let reviewText: string;

  if (contentType.includes("application/json")) {
    // ── テキスト直接受け取り ──────────────────────────────────────────────
    const body = await req.json() as { text?: string };
    const text = body.text?.trim() ?? "";
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    reviewText = text;
  } else {
    // ── FormData（音声ファイル）→ Whisper 文字起こし ─────────────────────
    if (!process.env.OPENAI_API_KEY) {
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

    const MAX_SIZE_BYTES = 25 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }

    const whisperForm = new FormData();
    const ext = audioFile.type.includes("mp4") ? "mp4" : "webm";
    whisperForm.append("file", audioFile, `audio.${ext}`);
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "ja");

    let whisperRes: Response;
    try {
      whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: whisperForm,
      });
    } catch (err) {
      console.error("[books/review] Whisper fetch failed:", err);
      return NextResponse.json({ error: "Network error" }, { status: 502 });
    }

    if (!whisperRes.ok) {
      const detail = await whisperRes.text().catch(() => "");
      console.error(`[books/review] Whisper error: status=${whisperRes.status} detail=${detail}`);
      return NextResponse.json({ error: "Transcription failed", detail }, { status: 500 });
    }

    const { text } = await whisperRes.json() as { text?: string };
    reviewText = text?.trim() ?? "";

    if (!reviewText) {
      return NextResponse.json({ error: "No text transcribed" }, { status: 400 });
    }
  }

  console.log(`[books/review] bookId=${bookId} userId=${user.id} textLen=${reviewText.length}`);

  // TODO: prisma.bookReview.create({ data: { bookId, userId: user.id, content: reviewText } })

  return NextResponse.json({ ok: true, text: reviewText });
}
