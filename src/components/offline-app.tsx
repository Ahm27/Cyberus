"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  challengeCatalog,
  type CatalogChallenge,
} from "@/lib/challenge-catalog";
import { challengeObjectives } from "@/lib/challenge-objectives";
import type { Puzzle } from "@/lib/challenge-engine";
import {
  getOfflineState,
  recordOfflineFailure,
  solveOffline,
  type OfflineState,
} from "@/lib/offline-db";
import { hintProgress } from "@/lib/hints";
import {
  ChallengeSimulator,
  type InteractionResult,
} from "./challenge-simulators";
import { FormMessage } from "./form-message";
import styles from "./challenge-simulator.module.css";

const caesar = (text: string, amount: number) =>
  text.replace(/[A-Z0-9]/g, (character) =>
    /\d/.test(character)
      ? String((Number(character) + amount + 10) % 10)
      : String.fromCharCode(
          ((character.charCodeAt(0) - 65 + amount + 26) % 26) + 65,
        ),
  );

function initialValue(type: CatalogChallenge["type"]) {
  switch (type) {
    case "IDOR":
      return "https://campuslink.test/profile?id=101";
    case "ACCESS_CONTROL":
      return "https://novadesk.test/home";
    case "CLIENT_TRUST":
      return "role=user";
    case "SQLI":
      return "student";
    default:
      return "";
  }
}

function offlinePuzzle(challenge: CatalogChallenge, flag: string): Puzzle {
  const puzzle: Puzzle = {
    kind: challenge.type,
    prompt: challenge.shortDescription,
    initial: initialValue(challenge.type),
  };
  if (challenge.type === "CAESAR") puzzle.encoded = caesar(flag, 3);
  if (challenge.type === "BASE64") puzzle.encoded = btoa(flag);
  return puzzle;
}

function profileId(value: string) {
  try {
    return new URL(value).searchParams.get("id") || "";
  } catch {
    return value.trim();
  }
}

function routePath(value: string) {
  try {
    return new URL(value).pathname;
  } catch {
    return value.trim();
  }
}

function evaluateOfflineInteraction(
  type: CatalogChallenge["type"],
  action: string,
  value: string,
  flag: string,
  scenario: number,
): InteractionResult {
  const denied = {
    success: false,
    message: "Nothing useful appeared. Review the clues and try again.",
  };

  switch (type) {
    case "IDOR":
      return action === "profile" && profileId(value) === "103"
        ? {
            success: true,
            message: "Unauthorized profile 103 opened.",
            flag,
            evidence: "Nadia Fox · Private note",
          }
        : {
            ...denied,
            evidence:
              profileId(value) === "101"
                ? "Maya Chen · Public profile"
                : profileId(value) === "102"
                  ? "Omar Saad · Public profile"
                  : "Profile not found",
          };
    case "ACCESS_CONTROL":
      return action === "route" &&
        routePath(value).replace(/\s/g, "").toLowerCase() === "/challenge-admin"
        ? {
            success: true,
            message: "Challenge-only admin panel opened without authorization.",
            flag,
          }
        : denied;
    case "PHISHING": {
      const answer = scenario
        ? "accounts@cyberus-alerts.co"
        : "security@cyberus-support.co";
      return action === "select" && value.trim().toLowerCase() === answer
        ? {
            success: true,
            message:
              "Phishing confirmed: lookalike domain, urgency, and credential request.",
            flag,
          }
        : denied;
    }
    case "NETWORK": {
      const answer = scenario ? "10.0.0.42" : "192.168.1.20";
      return action === "select" && value.trim() === answer
        ? {
            success: true,
            message: "Exposed RDP found on the unsafe workstation.",
            flag,
          }
        : denied;
    }
    case "PORTS":
      return action === "select" && value.trim() === "3306"
        ? { success: true, message: "Public MySQL exposure identified.", flag }
        : denied;
    case "CLIENT_TRUST":
      return action === "cookie" && value.trim().toLowerCase() === "role=admin"
        ? {
            success: true,
            message: "The sandbox trusted your edited role.",
            flag,
          }
        : denied;
    case "SOURCE":
      return action === "inspect"
        ? {
            success: true,
            message: "A hard-coded API key was discovered in the page source.",
            flag,
            evidence: `API_Key=${flag}`,
          }
        : denied;
    case "SQLI": {
      let username = value;
      try {
        username = (JSON.parse(value) as { username?: string }).username || "";
      } catch {
        // Accept a plain username as well as the simulator's credential object.
      }
      const normalized = username.replace(/\s+/g, " ").trim().toLowerCase();
      return action === "login" &&
        (normalized.includes("' or '1'='1") || normalized.includes("' or 1=1"))
        ? {
            success: true,
            message:
              "Simulated query bypassed. No database query was executed.",
            flag,
          }
        : denied;
    }
    default:
      return denied;
  }
}

export function OfflineApp() {
  const [state, setState] = useState<OfflineState | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [loadedValue, setLoadedValue] = useState("");
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [flag, setFlag] = useState("");
  const [status, setStatus] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState(0);
  const [dismissedHints, setDismissedHints] = useState(0);

  useEffect(() => {
    getOfflineState().then(setState);
  }, []);

  const challenge = active ? challengeCatalog[active - 1] : null;
  const puzzle = useMemo(
    () =>
      state && challenge
        ? offlinePuzzle(challenge, state.flags[challenge.number])
        : null,
    [state, challenge],
  );
  const activeHintProgress = hintProgress(
    active && state ? state.failedAttempts[active] || 0 : 0,
    challenge?.hints.length || 3,
  );

  if (!state)
    return (
      <main className="shell" style={{ padding: 40 }}>
        Loading offline mission pack…
      </main>
    );
  const offlineState = state;

  function openChallenge(item: CatalogChallenge) {
    const initial = initialValue(item.type);
    setActive(item.number);
    setValue(initial);
    setLoadedValue(initial);
    setResult(null);
    setFlag("");
    setStatus("");
    setSubmitError("");
    setScenario(0);
    setDismissedHints(
      hintProgress(
        offlineState.failedAttempts[item.number] || 0,
        item.hints.length,
      ).unlockedHints,
    );
  }

  async function runInteraction(action: string, nextValue = value) {
    if (!challenge || !active) return;
    setLoading(true);
    setSubmitError("");
    setStatus("");
    const outcome = evaluateOfflineInteraction(
      challenge.type,
      action,
      nextValue,
      offlineState.flags[active],
      scenario,
    );
    let nextState = offlineState;
    if (!outcome.success) {
      nextState = await recordOfflineFailure(active);
      setState({ ...nextState });
      if (
        scenario === 0 &&
        ["PHISHING", "NETWORK", "PORTS"].includes(challenge.type)
      ) {
        setScenario(1);
        setValue("");
      }
    }
    const progress = hintProgress(
      nextState.failedAttempts[active] || 0,
      challenge.hints.length,
    );
    setLoadedValue(nextValue);
    setResult({ ...outcome, ...progress });
    setLoading(false);
  }

  async function submitFlag(event: FormEvent) {
    event.preventDefault();
    if (!active || !challenge) return;
    setLoading(true);
    setSubmitError("");
    setStatus("");
    if (flag.trim().toUpperCase() !== offlineState.flags[active]) {
      const next = await recordOfflineFailure(active);
      setState({ ...next });
      setSubmitError(
        "Invalid local flag. Inspect the challenge and try again.",
      );
      setLoading(false);
      return;
    }

    const previouslyEligible = offlineState.solved.length >= 3;
    const next = await solveOffline(active);
    setState({ ...next });
    setStatus(
      offlineState.solved.includes(active)
        ? "Already breached — offline progress unchanged."
        : !previouslyEligible && next.solved.length >= 3
          ? "FLAG ACCEPTED · ROOT ACCESS GRANTED · OFFLINE PRIZE ELIGIBLE"
          : "FLAG ACCEPTED · CHALLENGE SOLVED · +1 OFFLINE BREACH",
    );
    setLoading(false);
  }

  const solvedCount = offlineState.solved.length;
  const solved = Boolean(active && offlineState.solved.includes(active));
  const objective = challenge
    ? challengeObjectives[challenge.type] || {
        title: "Investigate the challenge",
        steps: [
          "Inspect the simulator.",
          "Find the evidence.",
          "Submit the flag.",
        ],
      }
    : null;

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
          ID: <strong>{offlineState.id}</strong>
        </p>
        <p style={{ color: "var(--muted)", lineHeight: 1.55 }}>
          Every simulator and flag stays on this device. Offline progress is
          stored locally and requires manual verification.
        </p>
        <div style={{ fontSize: 28, fontWeight: 900 }}>
          {Math.min(solvedCount, 3)} / 3{" "}
          <small style={{ fontSize: 13, color: "var(--muted)" }}>
            TO UNLOCK
          </small>
        </div>
      </section>

      {solvedCount >= 3 && (
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
            {offlineState.id}
          </p>
          <p>
            <strong>Challenges solved: {solvedCount}/10</strong>
          </p>
          <p>
            Show this screen to Cyberus HR to register and verify your result.
          </p>
        </section>
      )}

      {active && challenge && puzzle && objective ? (
        <section style={{ marginTop: 18 }}>
          <button className="btn secondary" onClick={() => setActive(null)}>
            ← All challenges
          </button>
          <div style={{ margin: "24px 0 18px" }}>
            <p className="eyebrow">
              Offline challenge {String(active).padStart(2, "0")}
            </p>
            <h2 style={{ fontSize: 30, margin: "8px 0" }}>{challenge.title}</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              {challenge.instructions}
            </p>
          </div>

          <div className={styles.challengeFlow}>
            <section
              className={styles.objectiveCard}
              aria-labelledby="offline-challenge-goal"
            >
              <div className={styles.objectiveIcon}>◎</div>
              <div>
                <p className="eyebrow">Your goal</p>
                <h2 id="offline-challenge-goal">{objective.title}</h2>
                <ol>
                  {objective.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <div className={styles.hintMeter}>
                {activeHintProgress.unlockedHints >= challenge.hints.length
                  ? "All hints unlocked"
                  : `Next hint in ${activeHintProgress.attemptsUntilHint} failed ${activeHintProgress.attemptsUntilHint === 1 ? "attempt" : "attempts"}`}
              </div>
            </section>

            <section
              className="card"
              style={{ padding: "clamp(18px,5vw,28px)" }}
            >
              <p className="eyebrow">Interactive offline sandbox</p>
              <ChallengeSimulator
                key={active}
                type={challenge.type}
                puzzle={puzzle}
                value={value}
                loadedValue={loadedValue}
                loading={loading}
                result={result}
                scenario={scenario}
                unlockedHints={activeHintProgress.unlockedHints}
                onChange={setValue}
                onRun={runInteraction}
              />
              {result &&
                !result.success &&
                challenge.type !== "SQLI" &&
                challenge.type !== "CLIENT_TRUST" && (
                  <FormMessage error={result.message} />
                )}
            </section>

            <section
              className="card"
              style={{ padding: "clamp(18px,5vw,28px)" }}
            >
              <p className="eyebrow">Final step · submit evidence</p>
              <p className={styles.submitInstruction}>
                Find the flag inside the challenge, then type or paste it here.
                Evidence is never filled in automatically.
              </p>
              <form onSubmit={submitFlag} className={styles.flagForm}>
                <label className="label">
                  Local dynamic flag
                  <input
                    className="field mono"
                    value={flag}
                    onChange={(event) => setFlag(event.target.value)}
                    placeholder="CYBERUS{…}"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </label>
                <button className="btn" disabled={loading || solved}>
                  {solved
                    ? "BREACHED ✓"
                    : loading
                      ? "Validating…"
                      : "Submit flag"}
                </button>
                <FormMessage error={submitError} success={status} />
              </form>
              {solved && (
                <div className="status-ok" style={{ marginTop: 16 }}>
                  <strong>WHAT HAPPENED</strong>
                  <p style={{ lineHeight: 1.55, marginBottom: 0 }}>
                    {challenge.educationalExplanation}
                  </p>
                </div>
              )}
            </section>

            {activeHintProgress.unlockedHints > 0 && (
              <section className={styles.unlockedHintList}>
                <p className="eyebrow">Unlocked hints</p>
                {challenge.hints
                  .slice(0, activeHintProgress.unlockedHints)
                  .map((hint, index) => (
                    <p key={hint}>
                      <strong>Hint {index + 1}:</strong> {hint}
                    </p>
                  ))}
              </section>
            )}
          </div>

          {activeHintProgress.unlockedHints > dismissedHints && (
            <aside
              className={styles.flyingHint}
              role="status"
              aria-live="polite"
            >
              <button
                type="button"
                aria-label="Dismiss hint"
                onClick={() =>
                  setDismissedHints(activeHintProgress.unlockedHints)
                }
              >
                ×
              </button>
              <span>💡 Flying hint {activeHintProgress.unlockedHints}</span>
              <strong>
                {challenge.hints[activeHintProgress.unlockedHints - 1]}
              </strong>
              <small>
                Unlocked after {activeHintProgress.unlockedHints * 3} failed
                attempts
              </small>
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
                    className={`badge ${offlineState.solved.includes(item.number) ? "gold" : ""}`}
                  >
                    {offlineState.solved.includes(item.number)
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
                  onClick={() => openChallenge(item)}
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
