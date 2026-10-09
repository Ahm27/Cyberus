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
    return jsonError("Enter a valid University ID and choose a challenge.");
  const event = await db.event.findUnique({
    where: { slug: process.env.EVENT_SLUG || "orientation-2026" },
  });
  if (!event) return jsonError("The configured event could not be found.", 404);
  const participant = await db.participant.findUnique({
    where: {
      eventId_universityIdNormalized: {
        eventId: event.id,
        universityIdNormalized: normalizeUniversityId(parsed.data.universityId),
      },
    },
  });
  if (!participant)
    return jsonError("No online participant matches that University ID.", 404);
  const challenge = await db.challenge.findFirst({
    where: { id: parsed.data.challengeId, eventId: event.id },
  });
  if (!challenge)
    return jsonError("That challenge is unavailable. Refresh the page.", 404);
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
      "This participant already solved the challenge, so its flag cannot be reset.",
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
