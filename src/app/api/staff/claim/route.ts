import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { maskUniversityId, normalizeUniversityId } from "@/lib/security";
import { jsonError, validateOrigin } from "@/lib/http";
export async function GET(request: NextRequest) {
  if (!(await getAdmin())) return jsonError("Staff session required.", 401);
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return jsonError("Enter a claim code or University ID.");
  const claim = await db.prizeClaim.findFirst({
    where: {
      OR: [
        { id: q },
        { claimCode: q.toUpperCase() },
        { participant: { universityIdNormalized: normalizeUniversityId(q) } },
      ],
    },
    include: {
      participant: { include: { _count: { select: { solves: true } } } },
    },
  });
  if (!claim) return jsonError("No eligible online claim found.", 404);
  return NextResponse.json({
    id: claim.id,
    fullName: claim.participant.fullName,
    hackerAlias: claim.participant.hackerAlias,
    universityId: maskUniversityId(claim.participant.universityIdNormalized),
    solved: claim.participant._count.solves,
    eligible: claim.participant._count.solves >= 3,
    claimCode: claim.claimCode,
    claimedAt: claim.claimedAt,
  });
}
export async function POST(request: NextRequest) {
  if (!validateOrigin(request))
    return jsonError("Invalid request origin.", 403);
  const admin = await getAdmin();
  if (!admin) return jsonError("Staff session required.", 401);
  const body = (await request.json().catch(() => null)) as {
    claimId?: string;
  } | null;
  if (!body?.claimId) return jsonError("Claim is required.");
  const claimId = body.claimId;
  const now = new Date();
  try {
    const result = await db.$transaction(
      async (tx) => {
        const claim = await tx.prizeClaim.findUnique({
          where: { id: claimId },
          include: {
            participant: { include: { _count: { select: { solves: true } } } },
          },
        });
        if (!claim || claim.participant._count.solves < 3) return false;
        const offlineRedemption = await tx.offlinePrizeClaim.findUnique({
          where: {
            eventId_universityIdNormalized: {
              eventId: claim.participant.eventId,
              universityIdNormalized: claim.participant.universityIdNormalized,
            },
          },
        });
        if (offlineRedemption) return false;
        const updated = await tx.prizeClaim.updateMany({
          where: {
            id: claimId,
            claimedAt: null,
            participant: { solves: { some: {} } },
          },
          data: { claimedAt: now, claimedById: admin.id },
        });
        if (updated.count !== 1) return false;
        await tx.auditLog.create({
          data: {
            adminId: admin.id,
            action: "PRIZE_REDEEMED",
            entity: "PrizeClaim",
            entityId: claimId,
          },
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!result)
      return jsonError(
        "This prize was already claimed or is no longer eligible.",
        409,
      );
    return NextResponse.json({ ok: true, claimedAt: now.toISOString() });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    )
      return jsonError("This prize was claimed by another staff member.", 409);
    return jsonError("Prize redemption could not be completed.", 500);
  }
}
