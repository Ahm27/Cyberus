import { db } from "./db";
import { Prisma } from "@prisma/client";
import {
  decryptSecret,
  encryptSecret,
  generateFlag,
  hashSecret,
} from "./security";

export async function getOrCreateInstance(
  participantId: string,
  challengeId: string,
) {
  const active = await db.challengeInstance.findFirst({
    where: {
      participantId,
      challengeId,
      status: { in: ["ACTIVE", "SOLVED"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (active) return active;
  const flag = generateFlag();
  try {
    return await db.challengeInstance.create({
      data: {
        participantId,
        challengeId,
        activeKey: `${participantId}:${challengeId}`,
        flagHash: hashSecret(flag),
        flagCiphertext: encryptSecret(flag),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const winner = await db.challengeInstance.findFirst({
        where: { participantId, challengeId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      if (winner) return winner;
    }
    throw error;
  }
}
export function readFlag(instance: { flagCiphertext: string }) {
  return decryptSecret(instance.flagCiphertext);
}
export async function rotateInstance(
  participantId: string,
  challengeId: string,
) {
  return db.$transaction(async (tx) => {
    await tx.challengeInstance.updateMany({
      where: { participantId, challengeId, status: "ACTIVE" },
      data: {
        status: "INVALIDATED",
        invalidatedAt: new Date(),
        activeKey: null,
      },
    });
    const flag = generateFlag();
    return tx.challengeInstance.create({
      data: {
        participantId,
        challengeId,
        activeKey: `${participantId}:${challengeId}`,
        flagHash: hashSecret(flag),
        flagCiphertext: encryptSecret(flag),
      },
    });
  });
}
