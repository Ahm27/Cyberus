-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('ACTIVE', 'INVALIDATED', 'SOLVED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'EASY_MEDIUM', 'MEDIUM');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('IDOR', 'ACCESS_CONTROL', 'CAESAR', 'BASE64', 'PHISHING', 'NETWORK', 'PORTS', 'CLIENT_TRUST', 'SOURCE', 'SQLI');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventConfig" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EventConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "universityIdNormalized" TEXT NOT NULL,
    "hackerAlias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantSession" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "type" "ChallengeType" NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "hints" JSONB NOT NULL,
    "educationalExplanation" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeInstance" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "activeKey" TEXT,
    "flagHash" TEXT NOT NULL,
    "flagCiphertext" TEXT NOT NULL,
    "status" "InstanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invalidatedAt" TIMESTAMP(3),

    CONSTRAINT "ChallengeInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeAttempt" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantSolve" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantSolve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeClaim" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "claimCode" TEXT NOT NULL,
    "verifyTokenHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimedById" TEXT,

    CONSTRAINT "PrizeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflinePrizeClaim" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "universityIdNormalized" TEXT NOT NULL,
    "offlineParticipantId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedById" TEXT NOT NULL,

    CONSTRAINT "OfflinePrizeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventConfig_eventId_key" ON "EventConfig"("eventId");

-- CreateIndex
CREATE INDEX "Participant_eventId_createdAt_idx" ON "Participant"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_eventId_universityIdNormalized_key" ON "Participant"("eventId", "universityIdNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSession_tokenHash_key" ON "ParticipantSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ParticipantSession_participantId_expiresAt_idx" ON "ParticipantSession"("participantId", "expiresAt");

-- CreateIndex
CREATE INDEX "Challenge_eventId_enabled_idx" ON "Challenge"("eventId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_eventId_number_key" ON "Challenge"("eventId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_eventId_slug_key" ON "Challenge"("eventId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeInstance_activeKey_key" ON "ChallengeInstance"("activeKey");

-- CreateIndex
CREATE INDEX "ChallengeInstance_participantId_challengeId_status_idx" ON "ChallengeInstance"("participantId", "challengeId", "status");

-- CreateIndex
CREATE INDEX "ChallengeAttempt_participantId_createdAt_idx" ON "ChallengeAttempt"("participantId", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeAttempt_challengeId_correct_idx" ON "ChallengeAttempt"("challengeId", "correct");

-- CreateIndex
CREATE INDEX "ParticipantSolve_challengeId_solvedAt_idx" ON "ParticipantSolve"("challengeId", "solvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSolve_participantId_challengeId_key" ON "ParticipantSolve"("participantId", "challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeClaim_participantId_key" ON "PrizeClaim"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeClaim_claimCode_key" ON "PrizeClaim"("claimCode");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeClaim_verifyTokenHash_key" ON "PrizeClaim"("verifyTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "OfflinePrizeClaim_offlineParticipantId_key" ON "OfflinePrizeClaim"("offlineParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "OfflinePrizeClaim_eventId_universityIdNormalized_key" ON "OfflinePrizeClaim"("eventId", "universityIdNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "EventConfig" ADD CONSTRAINT "EventConfig_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeInstance" ADD CONSTRAINT "ChallengeInstance_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeInstance" ADD CONSTRAINT "ChallengeInstance_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ChallengeInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSolve" ADD CONSTRAINT "ParticipantSolve_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSolve" ADD CONSTRAINT "ParticipantSolve_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeClaim" ADD CONSTRAINT "PrizeClaim_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeClaim" ADD CONSTRAINT "PrizeClaim_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflinePrizeClaim" ADD CONSTRAINT "OfflinePrizeClaim_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflinePrizeClaim" ADD CONSTRAINT "OfflinePrizeClaim_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
