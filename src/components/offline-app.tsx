"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { challengeCatalog } from "@/lib/challenge-catalog";
import {
  getOfflineState,
  recordOfflineFailure,
  solveOffline,
  type OfflineState,
} from "@/lib/offline-db";
import { hintProgress } from "@/lib/hints";

const answers: Record<number, (value: string) => boolean> = {
  1: (v) => v.trim() === "103",
  2: (v) => v.trim().toLowerCase() === "/challenge-admin",
  3: () => true,
  4: () => true,
  5: (v) => v === "phish",
  6: (v) => v === "kiosk",
  7: (v) => v === "3306",
  8: (v) => v.trim().toLowerCase() === "role=admin",
  9: () => true,
  10: (v) => {
    const n = v.toLowerCase();
    return n.includes("' or '1'='1") || n.includes("' or 1=1");
  },
};
const shift = (text: string, n: number) =>
  text.replace(/[A-Z0-9]/g, (c) =>
    /\d/.test(c)
      ? String((Number(c) + n + 10) % 10)
      : String.fromCharCode(((c.charCodeAt(0) - 65 + n + 26) % 26) + 65),
  );
export function OfflineApp() {
  const [state, setState] = useState<OfflineState | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissedHints, setDismissedHints] = useState(0);
  useEffect(() => {
    getOfflineState().then(setState);
  }, []);
  const challenge = active ? challengeCatalog[active - 1] : null;
  const encoded = useMemo(
    () =>
      state && active === 3
        ? shift(state.flags[3], 3)
        : state && active === 4
          ? btoa(state.flags[4])
          : "",
    [state, active],
  );
  if (!state)
    return (
      <main className="shell" style={{ padding: 40 }}>
        Loading offline mission pack…
      </main>
    );
  async function complete() {
    if (!active) return;
    const next = await solveOffline(active);
    setState({ ...next });
    setMessage("OFFLINE BREACH RECORDED");
  }
  async function investigate() {
    if (!active || !state) return;
    const correct =
      active === 3 || active === 4
        ? value.trim().toUpperCase() === state.flags[active]
        : answers[active](value);
    if (correct) {
      setRevealed(true);
      setMessage("Evidence discovered. Submit the local flag below.");
    } else {
      const next = await recordOfflineFailure(active);
      setState({ ...next });
      setMessage("ACCESS DENIED · Inspect the clues and try again.");
    }
  }
  function open(number: number) {
    setActive(number);
    setValue(
      number === 1
        ? "101"
        : number === 2
          ? "/home"
          : number === 8
            ? "role=user"
            : "",
    );
    setRevealed(false);
    setMessage("");
    setDismissedHints(
      hintProgress(state?.failedAttempts[number] || 0, 3).unlockedHints,
    );
  }
  const solved = state.solved.length;
  const activeHintProgress = hintProgress(
    active ? state.failedAttempts[active] || 0 : 0,
    challenge?.hints.length || 3,
  );
  return (
    <main className="shell" style={{ padding: "20px 0 70px" }}>
      <section
        className="card"
        style={{ padding: "clamp(20px,5vw,34px)", borderColor: "#e5ca6d" }}
      >
        <span className="badge gold">Offline mode · manual verification</span>
        <h1 style={{ fontSize: "clamp(2rem,9vw,4rem)", margin: "14px 0 8px" }}>
          LOCAL MISSION PACK
        </h1>
        <p className="mono">
          ID: <strong>{state.id}</strong>
        </p>
        <p style={{ color: "var(--muted)", lineHeight: 1.55 }}>
          This device stores your progress. It is not verified online and will
          never merge automatically into online scoring.
        </p>
        <div style={{ fontSize: 28, fontWeight: 900 }}>
          {Math.min(solved, 3)} / 3{" "}
          <small style={{ fontSize: 13, color: "var(--muted)" }}>
            TO UNLOCK
          </small>
        </div>
      </section>
      {solved >= 3 && (
        <section
          className="card"
          style={{
            padding: 28,
            marginTop: 16,
            background: "#fffaf0",
            borderColor: "#e5ca6d",
          }}
        >
          <span className="badge gold">Offline prize eligibility</span>
          <h2>ROOT ACCESS GRANTED</h2>
          <p className="mono" style={{ fontSize: 21 }}>
            {state.id}
          </p>
          <p>
            <strong>Challenges solved: {solved}/10</strong>
          </p>
          <p>
            Show this screen to Cyberus HR to register your result and claim
            your prize.
          </p>
        </section>
      )}
      {active && challenge ? (
        <section
          className="card"
          style={{ padding: "clamp(18px,5vw,30px)", marginTop: 18 }}
        >
          <button className="btn secondary" onClick={() => setActive(null)}>
            ← All challenges
          </button>
          <p className="eyebrow" style={{ marginTop: 24 }}>
            Offline challenge {String(active).padStart(2, "0")}
          </p>
          <h2 style={{ fontSize: 30, margin: "8px 0" }}>{challenge.title}</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            {challenge.instructions}
          </p>
          <div className="terminal mono">
            {active === 3 || active === 4
              ? encoded
              : active === 5
                ? "library@university.edu · security@cyberus-support.co · events@cyberus.edu"
                : active === 6
                  ? "router · printer · kiosk (3389 RDP)"
                  : active === 7
                    ? "22 SSH · 80 HTTP · 443 HTTPS · 3306 MySQL"
                    : active === 9
                      ? "Tap Inspect Source to reveal the simulated comment."
                      : "challenge://input"}
          </div>
          {!revealed && (
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <input
                className="field mono"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  active === 5
                    ? "Type phish"
                    : active === 6
                      ? "Type kiosk"
                      : active === 7
                        ? "Type 3306"
                        : "Enter your finding"
                }
              />
              {(active === 3 || active === 4) && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() =>
                    setValue(active === 3 ? shift(encoded, -3) : atob(encoded))
                  }
                >
                  Use built-in decoder
                </button>
              )}
              <button className="btn" onClick={investigate}>
                {active === 9 ? "Inspect source" : "Investigate"}
              </button>
            </div>
          )}
          {revealed && (
            <div className="status-ok" style={{ marginTop: 14 }}>
              <p
                className="mono"
                style={{ fontWeight: 900, overflowWrap: "anywhere" }}
              >
                {state.flags[active]}
              </p>
              <button
                className="btn gold"
                onClick={complete}
                disabled={state.solved.includes(active)}
              >
                {state.solved.includes(active)
                  ? "BREACHED ✓"
                  : "Record offline solve"}
              </button>
            </div>
          )}
          {message && (
            <p
              role="status"
              className={
                message.startsWith("ACCESS") ? "status-error" : "status-ok"
              }
            >
              {message}
            </p>
          )}
          {activeHintProgress.unlockedHints > 0 && (
            <div className="status-ok" style={{ marginTop: 16 }}>
              <strong>UNLOCKED HINTS</strong>
              {challenge.hints
                .slice(0, activeHintProgress.unlockedHints)
                .map((hint, i) => (
                  <p key={hint}>
                    Hint {i + 1}: {hint}
                  </p>
                ))}
            </div>
          )}
          {activeHintProgress.unlockedHints < challenge.hints.length && (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              Next hint in {activeHintProgress.attemptsUntilHint} failed attempt
              {activeHintProgress.attemptsUntilHint === 1 ? "" : "s"}.
            </p>
          )}
          {activeHintProgress.unlockedHints > dismissedHints && (
            <aside
              role="status"
              style={{
                position: "fixed",
                zIndex: 50,
                right: 18,
                bottom: 18,
                width: "min(360px, calc(100vw - 36px))",
                border: "1px solid #e2bd4e",
                borderRadius: 16,
                padding: 18,
                background: "#fff8d9",
                boxShadow: "0 22px 55px rgba(70,56,12,.28)",
              }}
            >
              <button
                type="button"
                aria-label="Dismiss hint"
                onClick={() =>
                  setDismissedHints(activeHintProgress.unlockedHints)
                }
                style={{ float: "right", border: 0, background: "transparent" }}
              >
                ×
              </button>
              <strong>
                💡 Hint {activeHintProgress.unlockedHints}:{" "}
                {challenge.hints[activeHintProgress.unlockedHints - 1]}
              </strong>
            </aside>
          )}
        </section>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "end",
              margin: "32px 0 14px",
            }}
          >
            <div>
              <p className="eyebrow">Stored on this device</p>
              <h2 style={{ margin: 0 }}>Choose any challenge</h2>
            </div>
            <Link className="btn secondary" href="/register">
              Online mode
            </Link>
          </div>
          <section className="grid-cards">
            {challengeCatalog.map((item) => (
              <article
                className="card"
                key={item.number}
                style={{ padding: 20 }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <strong
                    className="mono"
                    style={{ fontSize: 24, color: "var(--teal)" }}
                  >
                    {String(item.number).padStart(2, "0")}
                  </strong>
                  <span
                    className={`badge ${state.solved.includes(item.number) ? "gold" : ""}`}
                  >
                    {state.solved.includes(item.number)
                      ? "Breached ✓"
                      : item.difficulty.replace("_", " / ")}
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>
                  {item.shortDescription}
                </p>
                <button
                  className="btn"
                  onClick={() => open(item.number)}
                  aria-label={`Attempt ${item.title}`}
                >
                  Attempt
                </button>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
