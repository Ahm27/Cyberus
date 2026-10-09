import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth";
import { jsonError, validateOrigin } from "@/lib/http";

export async function POST(request: NextRequest) {
  if (!validateOrigin(request))
    return jsonError("Invalid request origin.", 403);
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
