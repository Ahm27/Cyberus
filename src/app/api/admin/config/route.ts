import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, validateOrigin } from "@/lib/http";
export async function PATCH(request: NextRequest) {
  if (!validateOrigin(request))
    return jsonError("Invalid request origin.", 403);
  const admin = await getAdmin();
  if (!admin) return jsonError("Admin session required.", 401);
  const parsed = z
    .object({ leaderboardEnabled: z.boolean() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid configuration.");
  const event = await db.event.findUnique({
    where: { slug: process.env.EVENT_SLUG || "orientation-2026" },
  });
  if (!event) return jsonError("Event missing.", 404);
  await db.$transaction([
    db.eventConfig.upsert({
      where: { eventId: event.id },
      update: parsed.data,
      create: { eventId: event.id, ...parsed.data },
    }),
    db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "CONFIG_UPDATED",
        entity: "Event",
        entityId: event.id,
        metadata: parsed.data,
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
