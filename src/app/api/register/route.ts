import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createParticipantSession } from "@/lib/auth";
import { registrationSchema } from "@/lib/schemas";
import { normalizePhone, normalizeUniversityId } from "@/lib/security";
import { clientIp, jsonError, validateOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!validateOrigin(request))
    return jsonError("Invalid request origin.", 403);
  if (!rateLimit(`register:${clientIp(request)}`, 8, 60_000))
    return jsonError("Too many attempts. Wait a minute and try again.", 429);
  const parsed = registrationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return jsonError(parsed.error.issues[0]?.message || "Check your details.");
  try {
    const event = await db.event.findUnique({
      where: { slug: process.env.EVENT_SLUG || "orientation-2026" },
    });
    if (!event)
      return jsonError(
        "Event setup is incomplete. Ask a Cyberus organizer.",
        503,
      );
    const participant = await db.participant.create({
      data: {
        eventId: event.id,
        fullName: parsed.data.fullName,
        phoneNormalized: normalizePhone(parsed.data.phone),
        universityIdNormalized: normalizeUniversityId(parsed.data.universityId),
        hackerAlias: parsed.data.hackerAlias,
      },
    });
    await createParticipantSession(participant.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return jsonError(
        "That University ID is already registered for this event.",
        409,
      );
    return jsonError("Registration is temporarily unavailable.", 500);
  }
}
