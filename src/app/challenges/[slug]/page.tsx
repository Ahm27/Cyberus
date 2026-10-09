import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getParticipant } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateInstance, readFlag } from "@/lib/instances";
import { getPuzzle } from "@/lib/challenge-engine";
import { ChallengeConsole } from "@/components/challenge-console";
import { hintProgress } from "@/lib/hints";

export const dynamic = "force-dynamic";
export default async function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const participant = await getParticipant();
  if (!participant) redirect("/register");
  const { slug } = await params;
  const challenge = await db.challenge.findUnique({
    where: { eventId_slug: { eventId: participant.eventId, slug } },
  });
  if (!challenge?.enabled) notFound();
  const [instance, solve] = await Promise.all([
    getOrCreateInstance(participant.id, challenge.id),
    db.participantSolve.findUnique({
      where: {
        participantId_challengeId: {
          participantId: participant.id,
          challengeId: challenge.id,
        },
      },
    }),
  ]);
  const failedAttempts = await db.challengeAttempt.count({
    where: {
      participantId: participant.id,
      challengeId: challenge.id,
      instanceId: instance.id,
      correct: false,
    },
  });
  const puzzle = getPuzzle(challenge.type, readFlag(instance));
  return (
    <main className="shell" style={{ maxWidth: 780, padding: "18px 0 70px" }}>
      <Link href="/dashboard" className="eyebrow">
        ← Mission grid
      </Link>
      <header style={{ margin: "26px 0" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge">
            Challenge {String(challenge.number).padStart(2, "0")}
          </span>
          <span className="badge gold">
            {challenge.difficulty.replace("_", " / ")}
          </span>
        </div>
        <h1
          style={{
            fontSize: "clamp(2.2rem,10vw,4.8rem)",
            letterSpacing: "-.055em",
            lineHeight: 0.95,
            margin: "16px 0 10px",
          }}
        >
          {challenge.title}
        </h1>
        <p style={{ color: "var(--teal-dark)", fontWeight: 800 }}>
          {challenge.category}
        </p>
        <p style={{ lineHeight: 1.65, color: "var(--muted)" }}>
          {challenge.instructions}
        </p>
      </header>
      <ChallengeConsole
        challenge={{
          slug: challenge.slug,
          type: challenge.type,
          hints: challenge.hints as string[],
          explanation: challenge.educationalExplanation,
        }}
        puzzle={puzzle}
        initiallySolved={Boolean(solve)}
        initialHintProgress={hintProgress(
          failedAttempts,
          (challenge.hints as string[]).length,
        )}
      />
    </main>
  );
}
