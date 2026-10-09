import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getParticipant } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateInstance } from "@/lib/instances";
import {
  constantTimeMatch,
  generateClaimCode,
  hashSecret,
  randomToken,
} from "@/lib/security";
import { flagSchema } from "@/lib/schemas";
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
  const { slug } = await params;
  if (
    !rateLimit(
      `flag:${participant.id}:${slug}:${clientIp(request)}`,
      12,
      60_000,
    )
  )
    return jsonError(
      "Too many attempts. Review a hint and try again shortly.",
      429,
    );
  const parsed = flagSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Use the format CYBERUS{…}.");
  const challenge = await db.challenge.findUnique({
    where: { eventId_slug: { eventId: participant.eventId, slug } },
  });
  if (!challenge?.enabled) return jsonError("Challenge unavailable.", 404);
  const instance = await getOrCreateInstance(participant.id, challenge.id);
  const correct = constantTimeMatch(parsed.data.flag, instance.flagHash);
  await db.challengeAttempt.create({
    data: {
      participantId: participant.id,
      challengeId: challenge.id,
      instanceId: instance.id,
      correct,
    },
  });
  if (!correct) {
    const failedAttempts = await db.challengeAttempt.count({
      where: {
        participantId: participant.id,
        challengeId: challenge.id,
        instanceId: instance.id,
        correct: false,
      },
    });
    return NextResponse.json(
      {
        error: "ACCESS DENIED · Invalid flag. Try again.",
        ...hintProgress(failedAttempts, (challenge.hints as string[]).length),
      },
      { status: 400 },
    );
  }
  try {
    const result = await db.$transaction(
      async (tx) => {
        const existing = await tx.participantSolve.findUnique({
          where: {
            participantId_challengeId: {
              participantId: participant.id,
              challengeId: challenge.id,
            },
          },
        });
        if (existing)
          return {
            alreadySolved: true,
            prizeUnlocked: Boolean(
              await tx.prizeClaim.findUnique({
                where: { participantId: participant.id },
              }),
            ),
          };
        await tx.participantSolve.create({
          data: { participantId: participant.id, challengeId: challenge.id },
        });
        await tx.challengeInstance.update({
          where: { id: instance.id },
          data: { status: "SOLVED", activeKey: null },
        });
        const count = await tx.participantSolve.count({
          where: { participantId: participant.id },
        });
        let prizeUnlocked = false;
        if (count >= 3) {
          await tx.prizeClaim.upsert({
            where: { participantId: participant.id },
            update: {},
            create: {
              participantId: participant.id,
              claimCode: generateClaimCode(),
              verifyTokenHash: hashSecret(randomToken()),
            },
          });
          prizeUnlocked = true;
        }
        return { alreadySolved: false, prizeUnlocked, count };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    )
      return jsonError(
        "Progress changed at the same time. Submit once more to confirm.",
        409,
      );
    return jsonError(
      "Could not save progress. Your flag remains valid; try again.",
      500,
    );
  }
}
