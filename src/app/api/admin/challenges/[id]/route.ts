import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, validateOrigin } from "@/lib/http";
const schema = z.object({
  title: z.string().trim().min(3).max(80),
  shortDescription: z.string().trim().min(10).max(240),
  difficulty: z.enum(["EASY", "EASY_MEDIUM", "MEDIUM"]),
  enabled: z.boolean(),
  instructions: z.string().trim().min(10).max(2000).optional(),
  hints: z.array(z.string().min(2).max(300)).length(3).optional(),
  educationalExplanation: z.string().min(10).max(1200).optional(),
});
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validateOrigin(request))
    return jsonError("Invalid request origin.", 403);
  const admin = await getAdmin();
  if (!admin) return jsonError("Admin session required.", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return jsonError(
      parsed.error.issues[0]?.message || "Invalid challenge update.",
    );
  const { id } = await params;
  const updated = await db.challenge.updateMany({
    where: { id },
    data: parsed.data,
  });
  if (!updated.count) return jsonError("Challenge not found.", 404);
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "CHALLENGE_UPDATED",
      entity: "Challenge",
      entityId: id,
      metadata: { fields: Object.keys(parsed.data) },
    },
  });
  return NextResponse.json({ ok: true });
}
