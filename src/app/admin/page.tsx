import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminConsole } from "@/components/admin-console";
import { LogoutButton } from "@/components/logout-button";
import { hintProgress } from "@/lib/hints";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/staff/login");
  const event = await db.event.findUnique({
    where: { slug: process.env.EVENT_SLUG || "orientation-2026" },
    include: {
      config: true,
      challenges: {
        orderBy: { number: "asc" },
        include: { _count: { select: { attempts: true, solves: true } } },
      },
    },
  });
  if (!event)
    return <main className="shell">Run the database seed first.</main>;
  const [
    participants,
    totalSolves,
    eligible,
    claimed,
    solveCounts,
    offline,
    failedAttemptGroups,
  ] = await Promise.all([
    db.participant.count({ where: { eventId: event.id } }),
    db.participantSolve.count({
      where: { participant: { eventId: event.id } },
    }),
    db.prizeClaim.count({ where: { participant: { eventId: event.id } } }),
    db.prizeClaim.count({
      where: { participant: { eventId: event.id }, claimedAt: { not: null } },
    }),
    db.participant.findMany({
      where: { eventId: event.id },
      select: { _count: { select: { solves: true } } },
    }),
    db.offlinePrizeClaim.count({ where: { eventId: event.id } }),
    db.challengeAttempt.groupBy({
      by: ["challengeId", "participantId", "instanceId"],
      where: {
        correct: false,
        challenge: { eventId: event.id },
      },
      _count: { _all: true },
    }),
  ]);
  const challengeHintCounts = new Map(
    event.challenges.map((challenge) => [
      challenge.id,
      (challenge.hints as string[]).length,
    ]),
  );
  const hintMetrics = new Map<
    string,
    { unlocked: number; participants: Set<string> }
  >();
  for (const group of failedAttemptGroups) {
    const unlocked = hintProgress(
      group._count._all,
      challengeHintCounts.get(group.challengeId) || 3,
    ).unlockedHints;
    if (!unlocked) continue;
    const metric = hintMetrics.get(group.challengeId) || {
      unlocked: 0,
      participants: new Set<string>(),
    };
    metric.unlocked += unlocked;
    metric.participants.add(group.participantId);
    hintMetrics.set(group.challengeId, metric);
  }
  const totalHintsUnlocked = Array.from(hintMetrics.values()).reduce(
    (total, metric) => total + metric.unlocked,
    0,
  );
  const completions = solveCounts.filter(
    (participant) => participant._count.solves === 10,
  ).length;
  return (
    <main className="shell" style={{ padding: "22px 0 70px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <p className="eyebrow">Protected administration</p>
          <h1 style={{ fontSize: "clamp(2.2rem,8vw,4rem)", margin: "8px 0" }}>
            EVENT CONTROL
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn secondary" href="/staff/claim">
            Prize control
          </Link>
          <LogoutButton staff />
        </div>
      </div>
      <section className="grid-cards" style={{ margin: "24px 0" }}>
        {[
          ["Total participants", participants],
          ["Online participants", participants],
          ["Offline verified", offline],
          ["Total solves", totalSolves],
          ["Hints unlocked", totalHintsUnlocked],
          ["Prize eligible", eligible],
          ["Prizes claimed", claimed],
          ["10/10 completions", completions],
        ].map(([label, value]) => (
          <div className="card" style={{ padding: 20 }} key={label}>
            <p className="eyebrow">{label}</p>
            <strong style={{ fontSize: 34 }}>{value}</strong>
          </div>
        ))}
      </section>
      <AdminConsole
        event={{ leaderboardEnabled: event.config?.leaderboardEnabled ?? true }}
        challenges={event.challenges.map((c) => ({
          id: c.id,
          number: c.number,
          title: c.title,
          description: c.shortDescription,
          instructions: c.instructions,
          hints: c.hints as string[],
          explanation: c.educationalExplanation,
          difficulty: c.difficulty,
          enabled: c.enabled,
          attempts: c._count.attempts,
          solves: c._count.solves,
          hintsUnlocked: hintMetrics.get(c.id)?.unlocked || 0,
          hintParticipants: hintMetrics.get(c.id)?.participants.size || 0,
        }))}
      />
    </main>
  );
}
