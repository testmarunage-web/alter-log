import { NextRequest, NextResponse } from "next/server";

const CLERK_FAPI_HOST = "frontend-api.clerk.services";
const CLERK_INSTANCE_HOST = "clerk.alter-log.com";
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

async function handleRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
): Promise<NextResponse> {
  const url = new URL(req.url);
  const { path } = await params;

  // catch-all params からパスを組み立て（例: ["v1","environment"] → /v1/environment）
  const targetPath = path && path.length > 0 ? `/${path.join("/")}` : "/";
  const targetUrl = new URL(`https://${CLERK_FAPI_HOST}${targetPath}`);
  targetUrl.search = url.search;

  // 元のヘッダーを転送（hop-by-hop を除く）
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // TLSホストに合わせてHostを設定（clerk.alter-log.comはSSL未発行のためFAPI hostを使用）
  headers.set("Host", CLERK_FAPI_HOST);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", "https");
  // インスタンス識別のためにカスタムドメインを別ヘッダーで伝える
  headers.set("Clerk-Domain", CLERK_INSTANCE_HOST);

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
    const error = err instanceof Error ? err : new Error(String(err));
    const cause = error.cause instanceof Error ? error.cause.message : String(error.cause ?? "");
    console.error("[__clerk proxy] fetch error:", error.message, cause);
    return new NextResponse(
      JSON.stringify({ error: "proxy_error", detail: error.message, cause, targetUrl: targetUrl.toString() }),
      { status: 502 }
    );
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

type RouteContext = { params: Promise<{ path?: string[] }> };

export const GET    = (req: NextRequest, ctx: RouteContext) => handleRequest(req, ctx);
export const POST   = (req: NextRequest, ctx: RouteContext) => handleRequest(req, ctx);
export const PUT    = (req: NextRequest, ctx: RouteContext) => handleRequest(req, ctx);
export const DELETE = (req: NextRequest, ctx: RouteContext) => handleRequest(req, ctx);
export const PATCH  = (req: NextRequest, ctx: RouteContext) => handleRequest(req, ctx);
