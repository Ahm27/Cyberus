import Link from "next/link";
import { redirect } from "next/navigation";
import { getParticipant } from "@/lib/auth";
import { db } from "@/lib/db";
import { PrizeCard } from "@/components/prize-card";
import { ConnectionStatus } from "@/components/connection-status";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const participant = await getParticipant();
  if (!participant) redirect("/register");
  const [challenges, solves, prize] = await Promise.all([
    db.challenge.findMany({
      where: { eventId: participant.eventId, enabled: true },
      orderBy: { number: "asc" },
    }),
    db.participantSolve.findMany({
      where: { participantId: participant.id },
      select: { challengeId: true },
    }),
    db.prizeClaim.findUnique({ where: { participantId: participant.id } }),
  ]);
  const solved = new Set(solves.map((item) => item.challengeId));
  const total = solved.size;
  const threshold = Math.min(total, 3);
  const message =
    total >= 10
      ? "SYSTEM FULLY COMPROMISED"
      : total >= 3
        ? "ROOT ACCESS GRANTED"
        : total === 2
          ? "SECURITY LEVEL CRITICAL"
          : total === 1
            ? "BREACH #1 COMPLETE"
            : "BEGIN YOUR FIRST BREACH";
  return (
    <main className="shell" style={{ padding: "22px 0 70px" }}>
      <section
        className="card"
        style={{
          padding: "clamp(20px,4vw,34px)",
          background: "linear-gradient(120deg,#fff 55%,#e8f5f4)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="eyebrow">Operative</p>
            <h1
              style={{
                margin: "5px 0",
                fontSize: "clamp(2rem,8vw,4rem)",
                letterSpacing: "-.045em",
              }}
            >
              {participant.hackerAlias}
            </h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ConnectionStatus />
              <LogoutButton />
            </div>
          </div>
          <div style={{ minWidth: 210 }}>
            <p className="eyebrow">Breach progress</p>
            <div style={{ fontSize: 34, fontWeight: 900, margin: "8px 0" }}>
              <span style={{ color: "var(--teal)" }}>{threshold}</span> / 3{" "}
              <span style={{ fontSize: 14, color: "var(--muted)" }}>
                TO UNLOCK
              </span>
            </div>
            <div
              aria-label={`${threshold} of 3 required challenges`}
              style={{
                height: 10,
                borderRadius: 99,
                overflow: "hidden",
                background: "#dbe9e8",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(threshold / 3) * 100}%`,
                  background: total >= 3 ? "var(--gold)" : "var(--teal)",
                  transition: "width .4s",
                }}
              />
            </div>
            <p className="mono" style={{ fontWeight: 800, fontSize: 13 }}>
              {message}
            </p>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 0 }}>
              Total: {total} / 10
            </p>
          </div>
        </div>
      </section>
      {prize && <PrizeCard claim={prize} />}
      <div
        style={{
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 12,
          margin: "36px 0 14px",
        }}
      >
        <div>
          <p className="eyebrow">Mission grid</p>
          <h2 style={{ margin: "6px 0 0", fontSize: 28 }}>
            Choose any challenge
          </h2>
        </div>
        <Link href="/leaderboard" className="btn secondary">
          Board
        </Link>
      </div>
      <section className="grid-cards">
        {challenges.map((challenge) => (
          <article
            key={challenge.id}
            className="card"
            style={{ padding: 20, display: "grid", gap: 12 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 24, fontWeight: 900, color: "var(--teal)" }}
              >
                {String(challenge.number).padStart(2, "0")}
              </span>
              <span
                className={`badge ${solved.has(challenge.id) ? "gold" : ""}`}
              >
                {solved.has(challenge.id)
                  ? "Breached ✓"
                  : challenge.difficulty.replace("_", " / ")}
              </span>
            </div>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: 19 }}>
                {challenge.title}
              </h3>
              <p
                style={{
                  color: "var(--teal-dark)",
                  fontSize: 12,
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                {challenge.category}
              </p>
            </div>
            <p
              style={{
                color: "var(--muted)",
                fontSize: 14,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {challenge.shortDescription}
            </p>
            <Link
              className={`btn ${solved.has(challenge.id) ? "secondary" : ""}`}
              href={`/challenges/${challenge.slug}`}
              aria-label={`${solved.has(challenge.id) ? "Review" : "Attempt"} ${challenge.title}`}
            >
              {solved.has(challenge.id) ? "Review" : "Attempt"}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
