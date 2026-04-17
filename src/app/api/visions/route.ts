import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_VISIONS = 5;
const MAX_CONTENT_CHARS = 12000;
const MAX_LABEL_CHARS = 50;

function checkReadOnly(sub: { status: string; currentPeriodEnd: Date | null } | null): boolean {
  if (process.env.NODE_ENV === "development") return false;
  if (!sub) return true;
  if (sub.status === "ACTIVE" || sub.status === "PAST_DUE") return false;
  if (sub.status === "CANCELED" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()) return false;
  return true;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const visions = await prisma.vision.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true, content: true, sortOrder: true },
  });

  return NextResponse.json({ visions });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { subscription: { select: { status: true, currentPeriodEnd: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (checkReadOnly(user.subscription)) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  const count = await prisma.vision.count({ where: { userId: user.id } });
  if (count >= MAX_VISIONS) {
    return NextResponse.json({ error: `最大${MAX_VISIONS}つまでです` }, { status: 400 });
  }

  let body: { label?: string; content?: string };
  try { body = (await req.json()) as { label?: string; content?: string }; } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = (body.label ?? "").trim().slice(0, MAX_LABEL_CHARS) || `ビジョン${count + 1}`;
  const content = (body.content ?? "").trim();
  if (content.length > MAX_CONTENT_CHARS) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }

  const vision = await prisma.vision.create({
    data: { userId: user.id, label, content, sortOrder: count },
    select: { id: true, label: true, content: true, sortOrder: true },
  });

  return NextResponse.json({ vision });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { subscription: { select: { status: true, currentPeriodEnd: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (checkReadOnly(user.subscription)) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  let body: { id?: string; label?: string; content?: string };
  try { body = (await req.json()) as { id?: string; label?: string; content?: string }; } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.vision.findFirst({ where: { id: body.id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const label = body.label !== undefined ? (body.label.trim().slice(0, MAX_LABEL_CHARS) || existing.label) : existing.label;
  const content = body.content !== undefined ? body.content.trim() : existing.content;
  if (content.length > MAX_CONTENT_CHARS) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }

  // users.vision も同期更新（後方互換：最初のビジョンを users.vision にも反映）
  const updated = await prisma.vision.update({
    where: { id: body.id },
    data: { label, content },
    select: { id: true, label: true, content: true, sortOrder: true },
  });

  return NextResponse.json({ vision: updated });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { subscription: { select: { status: true, currentPeriodEnd: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (checkReadOnly(user.subscription)) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const count = await prisma.vision.count({ where: { userId: user.id } });
  if (count <= 1) {
    return NextResponse.json({ error: "最後のビジョンは削除できません" }, { status: 400 });
  }

  const existing = await prisma.vision.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vision.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
