import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { challengeCatalog } from "./challenge-catalog";
import {
  encryptSecret,
  generateFlag,
  hashSecret,
  normalizeUniversityId,
  randomToken,
} from "./security";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);
const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        databaseUrl ||
        "postgresql://integration:integration@127.0.0.1:5432/integration",
    },
  },
});
const eventSlug = `integration-${process.pid}`;
let eventId = "";

async function participant(suffix: string) {
  return prisma.participant.create({
    data: {
      eventId,
      fullName: `Student ${suffix}`,
      phoneNormalized: `2010000${suffix}`,
      universityIdNormalized: normalizeUniversityId(`test-${suffix}`),
      hackerAlias: `tester_${suffix}`,
    },
  });
}

integration("PostgreSQL invariants", () => {
  beforeAll(async () => {
    const event = await prisma.event.create({
      data: {
        slug: eventSlug,
        name: "Integration Event",
        config: { create: {} },
      },
    });
    eventId = event.id;
    for (const challenge of challengeCatalog) {
      await prisma.challenge.create({
        data: { eventId, ...challenge, hints: challenge.hints },
      });
    }
  });

  afterAll(async () => {
    if (eventId) await prisma.event.delete({ where: { id: eventId } });
    await prisma.$disconnect();
  });

  it("registers a participant and persists a hashed session", async () => {
    const person = await participant("registration");
    const token = randomToken();
    const session = await prisma.participantSession.create({
      data: {
        participantId: person.id,
        tokenHash: hashSecret(token),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    expect(session.participantId).toBe(person.id);
    expect(session.tokenHash).not.toContain(token);
  });

  it("rejects duplicate normalized University IDs", async () => {
    await participant("duplicate");
    await expect(participant("duplicate")).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("keeps one stable active instance and different participant flags", async () => {
    const [one, two, challenge] = await Promise.all([
      participant("flag-one"),
      participant("flag-two"),
      prisma.challenge.findFirstOrThrow({ where: { eventId, number: 1 } }),
    ]);
    const oneFlag = generateFlag();
    const twoFlag = generateFlag();
    const first = await prisma.challengeInstance.create({
      data: {
        participantId: one.id,
        challengeId: challenge.id,
        activeKey: `${one.id}:${challenge.id}`,
        flagHash: hashSecret(oneFlag),
        flagCiphertext: encryptSecret(oneFlag),
      },
    });
    await prisma.challengeInstance.create({
      data: {
        participantId: two.id,
        challengeId: challenge.id,
        activeKey: `${two.id}:${challenge.id}`,
        flagHash: hashSecret(twoFlag),
        flagCiphertext: encryptSecret(twoFlag),
      },
    });
    await expect(
      prisma.challengeInstance.create({
        data: {
          participantId: one.id,
          challengeId: challenge.id,
          activeKey: `${one.id}:${challenge.id}`,
          flagHash: hashSecret(generateFlag()),
          flagCiphertext: encryptSecret(generateFlag()),
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(oneFlag).not.toBe(twoFlag);
    expect(
      await prisma.challengeInstance.findUnique({ where: { id: first.id } }),
    ).toMatchObject({ id: first.id, status: "ACTIVE" });
  });

  it("counts a duplicate solve only once", async () => {
    const person = await participant("solve-once");
    const challenge = await prisma.challenge.findFirstOrThrow({
      where: { eventId, number: 2 },
    });
    await prisma.participantSolve.create({
      data: { participantId: person.id, challengeId: challenge.id },
    });
    await expect(
      prisma.participantSolve.create({
        data: { participantId: person.id, challengeId: challenge.id },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(
      await prisma.participantSolve.count({
        where: { participantId: person.id },
      }),
    ).toBe(1);
  });

  it("allows exactly one prize claim after three unique solves", async () => {
    const person = await participant("prize-once");
    const challenges = await prisma.challenge.findMany({
      where: { eventId },
      take: 4,
      orderBy: { number: "asc" },
    });
    for (const challenge of challenges.slice(0, 3))
      await prisma.participantSolve.create({
        data: { participantId: person.id, challengeId: challenge.id },
      });
    await prisma.prizeClaim.create({
      data: {
        participantId: person.id,
        claimCode: "CYB-TST-001",
        verifyTokenHash: hashSecret(randomToken()),
      },
    });
    await prisma.participantSolve.create({
      data: { participantId: person.id, challengeId: challenges[3].id },
    });
    await expect(
      prisma.prizeClaim.create({
        data: {
          participantId: person.id,
          claimCode: "CYB-TST-002",
          verifyTokenHash: hashSecret(randomToken()),
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(
      await prisma.prizeClaim.count({ where: { participantId: person.id } }),
    ).toBe(1);
  });

  it("atomically permits only one concurrent redemption", async () => {
    const person = await participant("redeem-race");
    const admin = await prisma.adminUser.create({
      data: {
        name: "Tester",
        email: `tester-${process.pid}@example.test`,
        passwordHash: "unused",
      },
    });
    const claim = await prisma.prizeClaim.create({
      data: {
        participantId: person.id,
        claimCode: "CYB-RCE-001",
        verifyTokenHash: hashSecret(randomToken()),
      },
    });
    const redeem = () =>
      prisma.prizeClaim.updateMany({
        where: { id: claim.id, claimedAt: null },
        data: { claimedAt: new Date(), claimedById: admin.id },
      });
    const results = await Promise.all([redeem(), redeem()]);
    expect(results.reduce((sum, item) => sum + item.count, 0)).toBe(1);
  });

  it("can query a public leaderboard projection without PII", async () => {
    const rows = await prisma.participant.findMany({
      where: { eventId },
      select: { hackerAlias: true, _count: { select: { solves: true } } },
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every(
        (row) =>
          !("fullName" in row) &&
          !("phoneNormalized" in row) &&
          !("universityIdNormalized" in row),
      ),
    ).toBe(true);
  });
});
