import { NextRequest, NextResponse } from "next/server";
import { getParticipant } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateInstance, readFlag } from "@/lib/instances";
import { interact } from "@/lib/challenge-engine";
import { interactionSchema } from "@/lib/schemas";
import { clientIp, jsonError, validateOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { hintProgress } from "@/lib/hints";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!validateOrigin(request))
    return jsonError("Invalid request origin.", 403);
  const participant = await getParticipant();
  if (!participant) return jsonError("Session required.", 401);
  if (!rateLimit(`interact:${participant.id}:${clientIp(request)}`, 40, 60_000))
    return jsonError("Slow down and inspect the clues.", 429);
  const parsed = interactionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return jsonError("Invalid action.");
  const { slug } = await params;
  const challenge = await db.challenge.findUnique({
    where: { eventId_slug: { eventId: participant.eventId, slug } },
  });
  if (!challenge?.enabled) return jsonError("Challenge unavailable.", 404);
  const instance = await getOrCreateInstance(participant.id, challenge.id);
  const result = interact(
    challenge.type,
    parsed.data.action,
    parsed.data.value || "",
    readFlag(instance),
  );
  if (!result.success) {
    await db.challengeAttempt.create({
      data: {
        participantId: participant.id,
        challengeId: challenge.id,
        instanceId: instance.id,
        correct: false,
      },
    });
  }
  const failedAttempts = await db.challengeAttempt.count({
    where: {
      participantId: participant.id,
      challengeId: challenge.id,
      instanceId: instance.id,
      correct: false,
    },
  });
  return NextResponse.json({
    ...result,
    ...hintProgress(failedAttempts, (challenge.hints as string[]).length),
  });
}
