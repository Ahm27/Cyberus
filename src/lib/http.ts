import { NextRequest, NextResponse } from "next/server";

export function validateOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    const originUrl = new URL(origin);
    const expectedHost =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    const expectedProtocol =
      request.headers.get("x-forwarded-proto") ||
      request.nextUrl.protocol.replace(":", "");
    const sameRequestOrigin =
      originUrl.host === expectedHost &&
      originUrl.protocol === `${expectedProtocol}:`;
    return sameRequestOrigin || origin === process.env.NEXT_PUBLIC_APP_URL;
  } catch {
    return false;
  }
}
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
export function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  );
}
