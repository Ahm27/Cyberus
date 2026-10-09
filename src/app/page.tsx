import Link from "next/link";
import { redirect } from "next/navigation";
import { getParticipant } from "@/lib/auth";
import { ConnectionStatus } from "@/components/connection-status";

export default async function Home() {
  if (await getParticipant()) redirect("/dashboard");
  return (
    <main className="shell" style={{ padding: "clamp(34px,8vw,90px) 0" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))",
          gap: 28,
          alignItems: "center",
        }}
      >
        <section>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge gold">Orientation Day</span>
            <ConnectionStatus />
          </div>
          <p className="eyebrow" style={{ marginTop: 28 }}>
            10 beginner missions · any order
          </p>
          <h1
            style={{
              fontSize: "clamp(2.8rem,10vw,6.8rem)",
              lineHeight: 0.88,
              letterSpacing: "-.065em",
              margin: "12px 0 20px",
            }}
          >
            BREACH
            <br />
            <span style={{ color: "var(--teal)" }}>THE BASICS.</span>
          </h1>
          <p
            style={{
              fontSize: "clamp(1rem,2.5vw,1.2rem)",
              lineHeight: 1.65,
              maxWidth: 590,
              color: "var(--muted)",
            }}
          >
            Solve any 3 safe, simulated cybersecurity challenges to unlock your
            physical prize. No experience or laptop required.
          </p>
          <div className="hero-actions">
            <Link className="btn" href="/register">
              Enter online mode
            </Link>
            <Link className="btn secondary" href="/offline">
              Use offline mode
            </Link>
          </div>
        </section>
        <aside className="card" style={{ padding: 24 }}>
          <p className="eyebrow">Mission protocol</p>
          <div
            className="terminal mono"
            style={{ marginTop: 16, lineHeight: 1.9 }}
          >
            <div>
              <span style={{ color: "#76d3c9" }}>$</span> target --list
            </div>
            <div>10 beginner challenges</div>
            <div>
              <span style={{ color: "#76d3c9" }}>$</span> prize --threshold
            </div>
            <div style={{ color: "#f4cf57" }}>3 UNIQUE BREACHES</div>
            <div>
              <span style={{ color: "#76d3c9" }}>$</span> safety --status
            </div>
            <div>SIMULATED · ISOLATED · READY</div>
          </div>
          <p
            style={{
              fontSize: 14,
              color: "var(--muted)",
              lineHeight: 1.55,
              marginBottom: 0,
            }}
          >
            Offline results require manual Cyberus HR verification and never
            merge automatically into online progress.
          </p>
        </aside>
      </div>
    </main>
  );
}
