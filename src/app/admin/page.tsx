import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminConsole } from "@/components/admin-console";
import { LogoutButton } from "@/components/logout-button";
import { hintProgress } from "@/lib/hints";
import styles from "@/components/admin-console.module.css";
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
  const metrics = [
    {
      label: "Online registrations",
      value: participants,
      detail: "Participants registered on the platform",
    },
    {
      label: "Offline prizes verified",
      value: offline,
      detail: "Offline results manually accepted by staff",
    },
    {
      label: "Completed challenges",
      value: totalSolves,
      detail: "Successful challenge solves across the event",
    },
    {
      label: "Hints revealed",
      value: totalHintsUnlocked,
      detail: "Hints unlocked after failed attempts",
    },
    {
      label: "Prize eligible",
      value: eligible,
      detail: "Online participants who completed three challenges",
    },
    {
      label: "Prizes redeemed",
      value: claimed,
      detail: "Online prizes confirmed by staff",
    },
    {
      label: "Full completions",
      value: completions,
      detail: "Participants who completed all ten challenges",
    },
  ];
  return (
    <main className={`shell ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <p className={`eyebrow ${styles.heroEyebrow}`}>
            Administrator workspace
          </p>
          <h1>EVENT OPERATIONS</h1>
          <p>
            Monitor participation, control participant-facing features, edit
            challenge guidance, and help learners recover broken instances.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link className="btn secondary" href="/staff/claim">
            Verify prizes
          </Link>
          <LogoutButton staff />
        </div>
      </header>
      <section
        className={styles.metricSection}
        aria-labelledby="event-snapshot"
      >
        <header className={styles.metricSectionHeader}>
          <div>
            <p className="eyebrow">Live event data</p>
            <h2 id="event-snapshot">Event snapshot</h2>
          </div>
          <p className={styles.helperText}>
            Counts refresh from the event database whenever this page loads or
            an administrative action completes.
          </p>
        </header>
        <div className={styles.metricCards}>
          {metrics.map((metric) => (
            <article className={`card ${styles.metricCard}`} key={metric.label}>
              <p className="eyebrow">{metric.label}</p>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </div>
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
