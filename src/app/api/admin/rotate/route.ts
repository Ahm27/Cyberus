import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { rotateInstance } from "@/lib/instances";
import { normalizeUniversityId } from "@/lib/security";
import { jsonError, validateOrigin } from "@/lib/http";
const schema = z.object({
  universityId: z.string().min(3).max(40),
  challengeId: z.string().min(1),
});
export async function POST(request: NextRequest) {
  if (!validateOrigin(request))
    return jsonError("Invalid request origin.", 403);
  const admin = await getAdmin();
  if (!admin) return jsonError("Admin session required.", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return jsonError("University ID and challenge are required.");
  const event = await db.event.findUnique({
    where: { slug: process.env.EVENT_SLUG || "orientation-2026" },
  });
  if (!event) return jsonError("Event missing.", 404);
  const participant = await db.participant.findUnique({
    where: {
      eventId_universityIdNormalized: {
        eventId: event.id,
        universityIdNormalized: normalizeUniversityId(parsed.data.universityId),
      },
    },
  });
  if (!participant) return jsonError("Participant not found.", 404);
  const challenge = await db.challenge.findFirst({
    where: { id: parsed.data.challengeId, eventId: event.id },
  });
  if (!challenge) return jsonError("Challenge not found.", 404);
  const solved = await db.participantSolve.findUnique({
    where: {
      participantId_challengeId: {
        participantId: participant.id,
        challengeId: challenge.id,
      },
    },
  });
  if (solved)
    return jsonError(
      "Solved instances are immutable; the solve already counts.",
      409,
    );
  const instance = await rotateInstance(participant.id, challenge.id);
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "INSTANCE_ROTATED",
      entity: "ChallengeInstance",
      entityId: instance.id,
      metadata: { participantId: participant.id, challengeId: challenge.id },
    },
  });
  return NextResponse.json({ ok: true });
}
