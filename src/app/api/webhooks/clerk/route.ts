import { headers } from "next/headers";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response("CLERK_WEBHOOK_SECRET is not set", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  // ユーザー作成時に DB へ同期（Webhook の重複発火によるレースコンディション対策）
  if (evt.type === "user.created") {
    try {
      await prisma.user.upsert({
        where:  { clerkId: evt.data.id },
        update: {},
        create: { clerkId: evt.data.id },
      });
    } catch (err) {
      // 並行リクエストによる一意制約違反は無視して 200 を返す
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        console.warn("[clerk webhook] P2002 ignored for clerkId:", evt.data.id);
      } else {
        throw err;
      }
    }
  }

  // ユーザー削除時に DB からも削除（Cascade でプロフィール等も削除される）
  if (evt.type === "user.deleted" && evt.data.id) {
    await prisma.user.deleteMany({
      where: { clerkId: evt.data.id },
    });
  }

  return new Response("OK", { status: 200 });
}
