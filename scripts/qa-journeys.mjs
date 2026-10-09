import assert from "node:assert/strict";
import { createDecipheriv } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const base = process.env.APP_URL || "http://127.0.0.1:3000";
const origin = new URL(base).origin;
const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const universityA = `QA-A-${stamp}`;
const universityB = `QA-B-${stamp}`;
const aliasA = `qa_a_${stamp}`;
const aliasB = `qa_b_${stamp}`;
const offlineId = `OFF-${stamp.slice(-6).padStart(6, "A")}`.toUpperCase();
const startedAt = new Date();
const passes = [];

function pass(name) {
  passes.push(name);
  console.log(`PASS ${name}`);
}

async function call(path, { method = "GET", cookie, body } = {}) {
  const headers = { origin };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  return fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
}

function sessionCookie(response) {
  const raw = response.headers.get("set-cookie");
  assert.ok(raw, "session response did not set a cookie");
  assert.match(raw, /HttpOnly/i);
  assert.match(raw, /SameSite=Lax/i);
  return raw.split(";", 1)[0];
}

async function json(response) {
  const payload = await response.json();
  return { response, payload };
}

async function register(fullName, universityId, hackerAlias) {
  const response = await call("/api/register", {
    method: "POST",
    body: {
      fullName,
      phone: "+20 100 555 0101",
      universityId,
      hackerAlias,
    },
  });
  assert.equal(response.status, 201, await response.text());
  return sessionCookie(response);
}

async function interact(cookie, slug, action, value = "") {
  const result = await json(
    await call(`/api/challenges/${slug}/interact`, {
      method: "POST",
      cookie,
      body: { action, value },
    }),
  );
  assert.equal(result.response.status, 200);
  return result.payload;
}

async function submit(cookie, slug, flag) {
  return json(
    await call(`/api/challenges/${slug}/submit`, {
      method: "POST",
      cookie,
      body: { flag },
    }),
  );
}

let participantA;
let participantB;
let leaderboardOriginal;
let testedEventId;

function decryptFlag(ciphertext) {
  const [iv, tag, body] = ciphertext
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.FLAG_ENCRYPTION_KEY, "hex"),
    iv,
  );
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString(
    "utf8",
  );
}

function caesar(text, shift) {
  return text.replace(/[A-Z0-9]/g, (character) => {
    if (/\d/.test(character))
      return String((Number(character) + shift + 10) % 10);
    return String.fromCharCode(
      ((character.charCodeAt(0) - 65 + shift + 26) % 26) + 65,
    );
  });
}
try {
  const crossOrigin = await fetch(`${base}/api/register`, {
    method: "POST",
    headers: {
      origin: "https://evil.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fullName: "Cross Origin",
      phone: "+20 100 000 0000",
      universityId: `EVIL-${stamp}`,
      hackerAlias: `evil_${stamp}`.slice(0, 24),
    }),
  });
  assert.equal(crossOrigin.status, 403);
  pass("cross-origin mutations are rejected");

  const anonymousAdmin = await call("/admin");
  assert.equal(anonymousAdmin.status, 307);
  assert.equal(anonymousAdmin.headers.get("location"), "/staff/login");
  pass("unauthorized users are redirected from real admin");

  const cookieA = await register("QA Student Alpha", universityA, aliasA);
  const cookieB = await register("QA Student Beta", universityB, aliasB);
  pass("two participants register and receive secure sessions");

  const duplicate = await call("/api/register", {
    method: "POST",
    body: {
      fullName: "Duplicate Student",
      phone: "+20 100 555 9999",
      universityId: universityA.toLowerCase().replaceAll("-", " "),
      hackerAlias: `dup_${stamp.slice(-12)}`,
    },
  });
  assert.equal(duplicate.status, 409);
  pass("normalized duplicate University ID is rejected");

  assert.equal((await call("/dashboard", { cookie: cookieA })).status, 200);
  assert.equal((await call("/dashboard")).status, 307);
  pass("dashboard requires and accepts the participant session");

  participantA = await prisma.participant.findFirstOrThrow({
    where: { universityIdNormalized: universityA.replaceAll("-", "") },
  });
  participantB = await prisma.participant.findFirstOrThrow({
    where: { universityIdNormalized: universityB.replaceAll("-", "") },
  });

  const hintProgress = [];
  for (const profileId of ["999", "998", "997"]) {
    hintProgress.push(
      await interact(
        cookieB,
        "not-your-profile",
        "profile",
        `https://campuslink.test/profile?id=${profileId}`,
      ),
    );
  }
  assert.deepEqual(
    hintProgress.map((attempt) => attempt.unlockedHints),
    [0, 0, 1],
  );
  assert.equal(hintProgress[2].failedAttempts, 3);
  pass("online hint progress is calculated and persisted by the backend");

  const idorA = await interact(cookieA, "not-your-profile", "profile", "103");
  const idorB = await interact(cookieB, "not-your-profile", "profile", "103");
  assert.equal(idorA.success, true);
  assert.equal(idorB.success, true);
  assert.notEqual(idorA.flag, idorB.flag);
  pass("participants receive different challenge flags");

  const challengeOne = await prisma.challenge.findFirstOrThrow({
    where: { eventId: participantA.eventId, number: 1 },
  });
  const instanceBefore = await prisma.challengeInstance.findFirstOrThrow({
    where: {
      participantId: participantA.id,
      challengeId: challengeOne.id,
      status: "ACTIVE",
    },
  });
  assert.equal(
    (await call("/challenges/not-your-profile", { cookie: cookieA })).status,
    200,
  );
  const instanceAfter = await prisma.challengeInstance.findFirstOrThrow({
    where: {
      participantId: participantA.id,
      challengeId: challengeOne.id,
      status: "ACTIVE",
    },
  });
  assert.equal(instanceBefore.id, instanceAfter.id);
  pass("refresh preserves the active challenge instance");

  assert.equal(
    (await submit(cookieB, "not-your-profile", idorA.flag)).response.status,
    400,
  );
  const accessA = await interact(
    cookieA,
    "admin-says-who",
    "route",
    "/challenge-admin",
  );
  assert.equal(accessA.success, true);
  assert.equal(
    (await submit(cookieA, "admin-says-who", idorA.flag)).response.status,
    400,
  );
  assert.equal(
    (await submit(cookieA, "not-your-profile", "CYBERUS{INVALID0000000}"))
      .response.status,
    400,
  );
  pass("wrong, shared, and cross-challenge flags are rejected");

  const firstSolve = await submit(cookieA, "not-your-profile", idorA.flag);
  assert.equal(firstSolve.response.status, 200);
  assert.equal(firstSolve.payload.count, 1);
  const duplicateSolve = await submit(cookieA, "not-your-profile", idorA.flag);
  assert.equal(duplicateSolve.response.status, 200);
  assert.equal(duplicateSolve.payload.alreadySolved, true);
  assert.equal(
    await prisma.participantSolve.count({
      where: { participantId: participantA.id },
    }),
    1,
  );
  pass("first and duplicate solve scoring is correct");

  assert.equal(
    (await submit(cookieA, "admin-says-who", accessA.flag)).response.status,
    200,
  );
  const phishingA = await interact(
    cookieA,
    "youve-been-phished",
    "select",
    "phish",
  );
  const thirdSolve = await submit(
    cookieA,
    "youve-been-phished",
    phishingA.flag,
  );
  assert.equal(thirdSolve.response.status, 200);
  assert.equal(thirdSolve.payload.count, 3);
  assert.equal(thirdSolve.payload.prizeUnlocked, true);
  assert.equal(
    await prisma.prizeClaim.count({
      where: { participantId: participantA.id },
    }),
    1,
  );
  pass("third unique solve creates exactly one prize claim");

  const networkA = await interact(
    cookieA,
    "whos-on-the-wifi",
    "select",
    "kiosk",
  );
  assert.equal(
    (await submit(cookieA, "whos-on-the-wifi", networkA.flag)).response.status,
    200,
  );
  assert.equal(
    await prisma.prizeClaim.count({
      where: { participantId: participantA.id },
    }),
    1,
  );
  pass("fourth solve and refresh do not create another prize claim");

  for (const [number, slug, encoder] of [
    [3, "secret-message", (flag) => caesar(flag, 3)],
    [4, "64-reasons", (flag) => Buffer.from(flag).toString("base64")],
  ]) {
    const challengePage = await call(`/challenges/${slug}`, {
      cookie: cookieA,
    });
    assert.equal(challengePage.status, 200);
    const challengeHtml = await challengePage.text();
    const challenge = await prisma.challenge.findFirstOrThrow({
      where: { eventId: participantA.eventId, number },
    });
    const instance = await prisma.challengeInstance.findFirstOrThrow({
      where: {
        participantId: participantA.id,
        challengeId: challenge.id,
        status: "ACTIVE",
      },
    });
    const flag = decryptFlag(instance.flagCiphertext);
    assert.ok(challengeHtml.includes(encoder(flag)));
    assert.equal((await submit(cookieA, slug, flag)).response.status, 200);
  }
  const remainingInteractive = [
    ["knock-knock", "select", "3306"],
    ["cookie-monster", "cookie", "role=admin"],
    ["source-never-lies", "inspect", ""],
    ["trust-no-input", "login", "' OR '1'='1' --"],
  ];
  for (const [slug, action, value] of remainingInteractive) {
    const finding = await interact(cookieA, slug, action, value);
    assert.equal(finding.success, true);
    assert.equal(
      (await submit(cookieA, slug, finding.flag)).response.status,
      200,
    );
  }
  assert.equal(
    await prisma.participantSolve.count({
      where: { participantId: participantA.id },
    }),
    10,
  );
  const completedDashboard = await call("/dashboard", { cookie: cookieA });
  assert.match(await completedDashboard.text(), /SYSTEM FULLY COMPROMISED/);
  assert.equal(
    await prisma.prizeClaim.count({
      where: { participantId: participantA.id },
    }),
    1,
  );
  pass(
    "all ten challenge delivery paths reach 10/10 without duplicating the prize",
  );

  const challengeAdminEscape = await interact(
    cookieA,
    "admin-says-who",
    "route",
    "/admin",
  );
  assert.equal(challengeAdminEscape.success, false);
  const destructiveSql = await interact(
    cookieA,
    "trust-no-input",
    "login",
    "DROP TABLE Participant",
  );
  assert.equal(destructiveSql.success, false);
  assert.ok(
    await prisma.participant.findUnique({ where: { id: participantA.id } }),
  );
  pass("challenge vulnerabilities cannot reach admin or execute SQL");

  const staffLogin = await call("/api/staff/login", {
    method: "POST",
    body: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
  });
  assert.equal(staffLogin.status, 200, await staffLogin.text());
  const staffCookie = sessionCookie(staffLogin);
  const adminPage = await call("/admin", { cookie: staffCookie });
  assert.equal(adminPage.status, 200);
  const adminHtml = await adminPage.text();
  assert.match(adminHtml, /Hints unlocked/);
  assert.match(adminHtml, /hints unlocked/);
  pass("staff authentication protects and unlocks administration");

  const event = await prisma.event.findUniqueOrThrow({
    where: { id: participantA.eventId },
    include: { config: true },
  });
  testedEventId = event.id;
  leaderboardOriginal = event.config?.leaderboardEnabled ?? true;
  const editableChallenge = await prisma.challenge.findFirstOrThrow({
    where: { eventId: event.id, number: 1 },
  });
  const editResponse = await call(
    `/api/admin/challenges/${editableChallenge.id}`,
    {
      method: "PATCH",
      cookie: staffCookie,
      body: {
        title: editableChallenge.title,
        shortDescription: editableChallenge.shortDescription,
        difficulty: editableChallenge.difficulty,
        enabled: editableChallenge.enabled,
        instructions: editableChallenge.instructions,
        hints: editableChallenge.hints,
        educationalExplanation: editableChallenge.educationalExplanation,
      },
    },
  );
  assert.equal(editResponse.status, 200, await editResponse.text());
  const disableBoard = await call("/api/admin/config", {
    method: "PATCH",
    cookie: staffCookie,
    body: { leaderboardEnabled: false },
  });
  assert.equal(disableBoard.status, 200);
  assert.match(await (await call("/leaderboard")).text(), /Leaderboard paused/);
  const enableBoard = await call("/api/admin/config", {
    method: "PATCH",
    cookie: staffCookie,
    body: { leaderboardEnabled: true },
  });
  assert.equal(enableBoard.status, 200);
  const rotateChallenge = await prisma.challenge.findFirstOrThrow({
    where: { eventId: event.id, number: 2 },
  });
  const rotateOnce = await call("/api/admin/rotate", {
    method: "POST",
    cookie: staffCookie,
    body: { universityId: universityB, challengeId: rotateChallenge.id },
  });
  assert.equal(rotateOnce.status, 200, await rotateOnce.text());
  const firstRotated = await prisma.challengeInstance.findFirstOrThrow({
    where: {
      participantId: participantB.id,
      challengeId: rotateChallenge.id,
      status: "ACTIVE",
    },
  });
  const rotateTwice = await call("/api/admin/rotate", {
    method: "POST",
    cookie: staffCookie,
    body: { universityId: universityB, challengeId: rotateChallenge.id },
  });
  assert.equal(rotateTwice.status, 200, await rotateTwice.text());
  const secondRotated = await prisma.challengeInstance.findFirstOrThrow({
    where: {
      participantId: participantB.id,
      challengeId: rotateChallenge.id,
      status: "ACTIVE",
    },
  });
  assert.notEqual(firstRotated.id, secondRotated.id);
  assert.equal(
    await prisma.challengeInstance.count({
      where: {
        participantId: participantB.id,
        challengeId: rotateChallenge.id,
        status: "ACTIVE",
      },
    }),
    1,
  );
  pass("admin editing, leaderboard control, and instance rotation work safely");

  const claim = await prisma.prizeClaim.findUniqueOrThrow({
    where: { participantId: participantA.id },
  });
  const lookup = await json(
    await call(`/api/staff/claim?q=${encodeURIComponent(claim.claimCode)}`, {
      cookie: staffCookie,
    }),
  );
  assert.equal(lookup.response.status, 200);
  assert.equal(lookup.payload.solved, 10);
  assert.match(lookup.payload.universityId, /^••••/);
  assert.equal("phoneNormalized" in lookup.payload, false);
  pass("staff claim lookup returns eligibility with masked identity");
  for (const lookupValue of [universityA, claim.id]) {
    const alternateLookup = await call(
      `/api/staff/claim?q=${encodeURIComponent(lookupValue)}`,
      { cookie: staffCookie },
    );
    assert.equal(alternateLookup.status, 200);
  }
  pass("staff can look up claims by code, University ID, or QR identifier");

  const competingRedemptions = await Promise.all([
    call("/api/staff/claim", {
      method: "POST",
      cookie: staffCookie,
      body: { claimId: claim.id },
    }),
    call("/api/staff/claim", {
      method: "POST",
      cookie: staffCookie,
      body: { claimId: claim.id },
    }),
  ]);
  assert.deepEqual(
    competingRedemptions.map((response) => response.status).sort(),
    [200, 409],
  );
  pass("concurrent prize redemption allows exactly one winner");

  const offlineClaim = await call("/api/staff/offline-claim", {
    method: "POST",
    cookie: staffCookie,
    body: {
      fullName: "QA Offline Student",
      phone: "+20 100 555 2222",
      universityId: `QA-OFF-${stamp}`,
      offlineParticipantId: offlineId,
    },
  });
  assert.equal(offlineClaim.status, 201, await offlineClaim.text());
  const offlineDuplicate = await call("/api/staff/offline-claim", {
    method: "POST",
    cookie: staffCookie,
    body: {
      fullName: "QA Offline Duplicate",
      phone: "+20 100 555 3333",
      universityId: `QA OFF ${stamp}`,
      offlineParticipantId:
        `OFF-${stamp.slice(-5).padStart(6, "B")}`.toUpperCase(),
    },
  });
  assert.equal(offlineDuplicate.status, 409);
  const onlinePrizeDuplicate = await call("/api/staff/offline-claim", {
    method: "POST",
    cookie: staffCookie,
    body: {
      fullName: "QA Student Alpha",
      phone: "+20 100 555 0101",
      universityId: universityA,
      offlineParticipantId:
        `OFF-${stamp.slice(-4).padStart(6, "C")}`.toUpperCase(),
    },
  });
  assert.equal(onlinePrizeDuplicate.status, 409);
  pass("offline claims prevent duplicate offline and online prize identities");

  const leaderboard = await call("/leaderboard");
  const leaderboardHtml = await leaderboard.text();
  assert.equal(leaderboard.status, 200);
  assert.match(leaderboardHtml, new RegExp(aliasA));
  assert.doesNotMatch(leaderboardHtml, /QA Student Alpha/);
  assert.doesNotMatch(leaderboardHtml, new RegExp(universityA));
  assert.doesNotMatch(leaderboardHtml, /201005550101/);
  pass("public leaderboard exposes aliases and solve counts only");

  assert.equal(
    await prisma.participantSolve.count({
      where: { participantId: participantB.id },
    }),
    0,
  );
  pass("unverified/offline work never becomes online progress automatically");

  assert.equal(
    (
      await call("/api/logout", {
        method: "POST",
        cookie: cookieA,
      })
    ).status,
    200,
  );
  assert.equal((await call("/dashboard", { cookie: cookieA })).status, 307);
  assert.equal(
    (
      await call("/api/staff/logout", {
        method: "POST",
        cookie: staffCookie,
      })
    ).status,
    200,
  );
  assert.equal((await call("/admin", { cookie: staffCookie })).status, 307);
  pass("participant and staff logout invalidate server-side sessions");

  console.log(`\n${passes.length} database-backed journeys passed.`);
} finally {
  if (testedEventId && leaderboardOriginal !== undefined) {
    await prisma.eventConfig.updateMany({
      where: { eventId: testedEventId },
      data: { leaderboardEnabled: leaderboardOriginal },
    });
  }
  await prisma.offlinePrizeClaim.deleteMany({
    where: {
      offlineParticipantId: { startsWith: "OFF-" },
      fullName: { startsWith: "QA Offline" },
    },
  });
  await prisma.participant.deleteMany({
    where: {
      universityIdNormalized: {
        in: [universityA, universityB].map((value) =>
          value.replaceAll("-", ""),
        ),
      },
    },
  });
  const admin = await prisma.adminUser.findUnique({
    where: { email: process.env.ADMIN_EMAIL },
  });
  if (admin) {
    await prisma.adminSession.deleteMany({
      where: { adminId: admin.id, expiresAt: { gt: startedAt } },
    });
  }
  await prisma.$disconnect();
}
