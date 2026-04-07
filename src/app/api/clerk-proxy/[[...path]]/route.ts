import { NextRequest, NextResponse } from "next/server";

const CLERK_FAPI_HOST = "frontend-api.clerk.services";
const CLERK_INSTANCE_HOST = "clerk.alter-log.com";
// rewriteで /__clerk/:path* → /api/clerk-proxy/:path* に変換されるため、このプレフィックスを除去する
const ROUTE_PATH_PREFIX = "/api/clerk-proxy";
// Location ヘッダーのリライトは外部公開パス（/__clerk）に戻す
const PUBLIC_PROXY_PREFIX = "/__clerk";

// hop-by-hop ヘッダーは転送しない
const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
];

async function handleRequest(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);

  // /api/clerk-proxy 以降のパスを取得（例: /api/clerk-proxy/v1/environment → /v1/environment）
  const targetPath = url.pathname.slice(ROUTE_PATH_PREFIX.length) || "/";
  const targetUrl = new URL(`https://${CLERK_FAPI_HOST}${targetPath}`);
  targetUrl.search = url.search;

  // 元のヘッダーを転送（hop-by-hop を除く）
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Clerkインスタンス識別に必要なヘッダーを上書き
  headers.set("Host", CLERK_INSTANCE_HOST);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", "https");

  const hasBody = ["POST", "PUT", "PATCH"].includes(req.method);

  let response: Response;
  try {
    response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      // @ts-expect-error duplex is required for streaming but missing in some TS defs
      duplex: hasBody ? "half" : undefined,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[__clerk proxy] fetch error:", detail);
    return new NextResponse(JSON.stringify({ error: "proxy_error", detail, targetUrl: targetUrl.toString() }), { status: 502 });
  }

  // レスポンスヘッダーを転送（hop-by-hop を除く）
  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  // Location ヘッダーのリライト（FAPI → プロキシURL）
  const location = response.headers.get("location");
  if (location) {
    try {
      const locationUrl = new URL(location);
      if (locationUrl.host === CLERK_FAPI_HOST || locationUrl.host === CLERK_INSTANCE_HOST) {
        responseHeaders.set(
          "Location",
          `${url.origin}${PUBLIC_PROXY_PREFIX}${locationUrl.pathname}${locationUrl.search}${locationUrl.hash}`
        );
      }
    } catch {
      // 相対URLなどパース失敗は無視
    }
  }

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const DELETE = handleRequest;
export const PATCH = handleRequest;
