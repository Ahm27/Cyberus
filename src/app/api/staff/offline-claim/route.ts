import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { offlineClaimSchema } from "@/lib/schemas";
import { normalizePhone, normalizeUniversityId } from "@/lib/security";
import { jsonError, validateOrigin } from "@/lib/http";
export async function POST(request: NextRequest) {
  if (!validateOrigin(request))
    return jsonError("Invalid request origin.", 403);
  const admin = await getAdmin();
  if (!admin) return jsonError("Staff session required.", 401);
  const parsed = offlineClaimSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return jsonError(
      parsed.error.issues[0]?.message || "Check the participant details.",
    );
  const event = await db.event.findUnique({
    where: { slug: process.env.EVENT_SLUG || "orientation-2026" },
  });
  if (!event) return jsonError("Event is not configured.", 503);
  const universityId = normalizeUniversityId(parsed.data.universityId);
  try {
    await db.$transaction(
      async (tx) => {
        const online = await tx.participant.findUnique({
          where: {
            eventId_universityIdNormalized: {
              eventId: event.id,
              universityIdNormalized: universityId,
            },
          },
          include: { prizeClaim: true },
        });
        if (online?.prizeClaim) throw new Error("DUPLICATE_PRIZE");
        const claim = await tx.offlinePrizeClaim.create({
          data: {
            eventId: event.id,
            fullName: parsed.data.fullName,
            phoneNormalized: normalizePhone(parsed.data.phone),
            universityIdNormalized: universityId,
            offlineParticipantId:
              parsed.data.offlineParticipantId.toUpperCase(),
            claimedById: admin.id,
          },
        });
        await tx.auditLog.create({
          data: {
            adminId: admin.id,
            action: "OFFLINE_PRIZE_REDEEMED",
            entity: "OfflinePrizeClaim",
            entityId: claim.id,
            metadata: { verification: "MANUAL" },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_PRIZE")
      return jsonError(
        "This University ID already has an online prize claim.",
        409,
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return jsonError(
        "This University ID or Offline Participant ID is already registered.",
        409,
      );
    return jsonError("Could not register the offline claim.", 500);
  }
}
