import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Leaderboard() {
  const event = await db.event.findUnique({
    where: { slug: process.env.EVENT_SLUG || "orientation-2026" },
    include: { config: true },
  });
  if (!event?.config?.leaderboardEnabled)
    return (
      <main className="shell" style={{ padding: "50px 0" }}>
        <section className="card" style={{ padding: 30 }}>
          <p className="eyebrow">Live breach board</p>
          <h1>Leaderboard paused</h1>
          <p>Event staff have temporarily disabled public rankings.</p>
        </section>
      </main>
    );
  const people = await db.participant.findMany({
    where: { eventId: event.id },
    select: { hackerAlias: true, solves: { select: { solvedAt: true } } },
    take: 100,
  });
  const ranked = people
    .map((p) => ({
      alias: p.hackerAlias,
      count: p.solves.length,
      last: p.solves.reduce<Date | null>(
        (latest, s) => (!latest || s.solvedAt > latest ? s.solvedAt : latest),
        null,
      ),
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        (a.last?.getTime() || Infinity) - (b.last?.getTime() || Infinity),
    );
  return (
    <main className="shell" style={{ maxWidth: 720, padding: "28px 0 70px" }}>
      <p className="eyebrow">Public aliases only</p>
      <h1 style={{ fontSize: "clamp(2.4rem,10vw,5rem)", margin: "8px 0 24px" }}>
        LIVE BREACH BOARD
      </h1>
      <section className="card" style={{ overflow: "hidden" }}>
        {ranked.length ? (
          ranked.map((row, index) => (
            <div
              key={`${row.alias}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <strong
                className="mono"
                style={{ color: index < 3 ? "var(--gold)" : "var(--muted)" }}
              >
                #{index + 1}
              </strong>
              <strong>{row.alias}</strong>
              <span className="badge">{row.count}/10</span>
            </div>
          ))
        ) : (
          <p style={{ padding: 24 }}>No breaches yet. Be the first.</p>
        )}
      </section>
    </main>
  );
}
