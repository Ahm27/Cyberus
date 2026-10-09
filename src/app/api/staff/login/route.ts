import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createAdminSession } from "@/lib/auth";
import { staffLoginSchema } from "@/lib/schemas";
import { clientIp, jsonError, validateOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(request: NextRequest) {
  if (!validateOrigin(request))
    return jsonError("Invalid request origin.", 403);
  if (!rateLimit(`staff-login:${clientIp(request)}`, 6, 300000))
    return jsonError("Too many attempts. Try again later.", 429);
  const parsed = staffLoginSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return jsonError("Invalid credentials.", 401);
  const admin = await db.adminUser.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (
    !admin?.active ||
    !(await bcrypt.compare(parsed.data.password, admin.passwordHash))
  )
    return jsonError("Invalid credentials.", 401);
  await createAdminSession(admin.id);
  return NextResponse.json({ ok: true });
}
