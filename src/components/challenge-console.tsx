"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Puzzle } from "@/lib/challenge-engine";
import { FormMessage } from "./form-message";
import {
  ChallengeSimulator,
  type InteractionResult,
} from "./challenge-simulators";
import styles from "./challenge-simulator.module.css";

type Challenge = {
  slug: string;
  type: string;
  hints: string[];
  explanation: string;
};

const objectives: Record<string, { title: string; steps: string[] }> = {
  IDOR: {
    title: "Open a profile that does not belong to you",
    steps: [
      "Edit the complete CampusLink address.",
      "Find the unauthorized profile.",
      "Copy the flag shown inside that profile.",
    ],
  },
  ACCESS_CONTROL: {
    title: "Reach NovaDesk's hidden admin page",
    steps: [
      "Explore the dashboard, then edit the complete address.",
      "Request the unlinked admin route.",
      "Copy the flag from the unauthorized admin page.",
    ],
  },
  CAESAR: {
    title: "Decode the attacker's secret message",
    steps: [
      "Read the intercepted chat message.",
      "Shift every letter and digit back by 3 yourself.",
      "Submit the decoded CYBERUS flag.",
    ],
  },
  BASE64: {
    title: "Decode the captured Base64 payload",
    steps: [
      "Inspect the captured payload.",
      "Use the payload tool to decode it.",
      "Copy and submit the decoded flag.",
    ],
  },
  PHISHING: {
    title: "Identify the phishing sender",
    steps: [
      "Open and inspect all three emails.",
      "Look for a fake domain, urgency, and a password request.",
      "Enter the phisher's complete email address.",
    ],
  },
  NETWORK: {
    title: "Find the unsafe device on the router",
    steps: [
      "Inspect every connected device and exposed service.",
      "Find the host exposing remote desktop.",
      "Enter that device's IP address.",
    ],
  },
  PORTS: {
    title: "Find the database exposed to the internet",
    steps: [
      "Review the public server's open ports.",
      "Choose the database service that should be restricted.",
      "Enter its port number.",
    ],
  },
  CLIENT_TRUST: {
    title: "Escalate the simulated browser role",
    steps: [
      "Inspect the client-controlled cookie.",
      "Change the role to an administrator value.",
      "Reload the vault and copy the exposed flag.",
    ],
  },
  SOURCE: {
    title: "Find the secret left in page source",
    steps: [
      "Open the simulated source viewer.",
      "Inspect the developer comment.",
      "Copy the flag left in the source.",
    ],
  },
  SQLI: {
    title: "Bypass the simulated login query",
    steps: [
      "Change the username so the condition becomes true.",
      "Submit the training login form.",
      "Copy the flag from the bypassed session.",
    ],
  },
};

export function ChallengeConsole({
  challenge,
  puzzle,
  initiallySolved,
  initialHintProgress,
}: {
  challenge: Challenge;
  puzzle: Puzzle;
  initiallySolved: boolean;
  initialHintProgress: {
    failedAttempts: number;
    unlockedHints: number;
    attemptsUntilHint: number;
  };
}) {
  const router = useRouter();
  const [value, setValue] = useState(puzzle.initial || "");
  const [loadedValue, setLoadedValue] = useState(puzzle.initial || "");
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [flag, setFlag] = useState("");
  const [status, setStatus] = useState("");
  const [interactionError, setInteractionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(initialHintProgress);
  const [dismissedHints, setDismissedHints] = useState(0);
  const [scenario, setScenario] = useState(0);
  const [solved, setSolved] = useState(initiallySolved);

  const objective = objectives[challenge.type] || {
    title: "Investigate the challenge",
    steps: ["Inspect the simulator.", "Find the evidence.", "Submit the flag."],
  };
  const { unlockedHints, attemptsUntilHint } = progress;
  const showFlyingHint = unlockedHints > dismissedHints;

  function applyServerProgress(data: InteractionResult) {
    if (
      typeof data.failedAttempts === "number" &&
      typeof data.unlockedHints === "number" &&
      typeof data.attemptsUntilHint === "number"
    ) {
      setProgress({
        failedAttempts: data.failedAttempts,
        unlockedHints: data.unlockedHints,
        attemptsUntilHint: data.attemptsUntilHint,
      });
    }
  }

  async function interact(action: string, nextValue = value) {
    setLoading(true);
    setInteractionError("");
    setSubmitError("");
    try {
      const response = await fetch(
        `/api/challenges/${challenge.slug}/interact`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, value: nextValue }),
        },
      );
      const data = (await response.json()) as InteractionResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Action failed");
      applyServerProgress(data);
      setResult(data);
      setLoadedValue(nextValue);
      if (!data.success) {
        if (
          scenario === 0 &&
          (challenge.type === "PHISHING" ||
            challenge.type === "NETWORK" ||
            challenge.type === "PORTS")
        ) {
          setScenario(1);
          setValue("");
        }
      }
    } catch (cause) {
      setInteractionError(
        cause instanceof Error
          ? cause.message
          : "CONNECTION LOST — your action was not submitted.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSubmitError("");
    setStatus("");
    try {
      const response = await fetch(`/api/challenges/${challenge.slug}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flag }),
      });
      const data = await response.json();
      if (!response.ok) {
        applyServerProgress(data);
        setSubmitError(data.error || "Invalid flag. Try again.");
        return;
      }
      setSolved(true);
      setStatus(
        data.alreadySolved
          ? "Already breached — progress unchanged."
          : data.prizeUnlocked
            ? "FLAG ACCEPTED · ROOT ACCESS GRANTED · PRIZE UNLOCKED"
            : "FLAG ACCEPTED · CHALLENGE SOLVED · +1 BREACH",
      );
      router.refresh();
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : "CONNECTION LOST — your flag was not submitted. It is still in the field.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.challengeFlow}>
      <section
        className={styles.objectiveCard}
        aria-labelledby="challenge-goal"
      >
        <div className={styles.objectiveIcon}>◎</div>
        <div>
          <p className="eyebrow">Your goal</p>
          <h2 id="challenge-goal">{objective.title}</h2>
          <ol>
            {objective.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <div className={styles.hintMeter}>
          {unlockedHints >= challenge.hints.length
            ? "All hints unlocked"
            : `Next hint in ${attemptsUntilHint} failed ${attemptsUntilHint === 1 ? "attempt" : "attempts"}`}
        </div>
      </section>

      <section className="card" style={{ padding: "clamp(18px,5vw,28px)" }}>
        <p className="eyebrow">Interactive challenge sandbox</p>
        <ChallengeSimulator
          type={challenge.type}
          puzzle={puzzle}
          value={value}
          loadedValue={loadedValue}
          loading={loading}
          result={result}
          scenario={scenario}
          unlockedHints={unlockedHints}
          onChange={setValue}
          onRun={interact}
        />
        {result &&
          !result.success &&
          challenge.type !== "SQLI" &&
          challenge.type !== "CLIENT_TRUST" && (
            <FormMessage error={result.message} />
          )}
        <FormMessage error={interactionError} />
      </section>

      <section className="card" style={{ padding: "clamp(18px,5vw,28px)" }}>
        <p className="eyebrow">Final step · submit evidence</p>
        <p className={styles.submitInstruction}>
          Find the flag inside the challenge, then type or paste it here.
          Evidence is never filled in automatically.
        </p>
        <form onSubmit={submit} className={styles.flagForm}>
          <label className="label">
            Dynamic flag
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
            {solved ? "BREACHED ✓" : loading ? "Validating…" : "Submit flag"}
          </button>
          <FormMessage error={submitError} success={status} />
        </form>
        {solved && (
          <div className="status-ok" style={{ marginTop: 16 }}>
            <strong>WHAT HAPPENED</strong>
            <p style={{ lineHeight: 1.55, marginBottom: 0 }}>
              {challenge.explanation}
            </p>
          </div>
        )}
      </section>

      {unlockedHints > 0 && (
        <section className={styles.unlockedHintList}>
          <p className="eyebrow">Unlocked hints</p>
          {challenge.hints.slice(0, unlockedHints).map((hint, index) => (
            <p key={hint}>
              <strong>Hint {index + 1}:</strong> {hint}
            </p>
          ))}
        </section>
      )}

      {showFlyingHint && (
        <aside className={styles.flyingHint} role="status" aria-live="polite">
          <button
            type="button"
            aria-label="Dismiss hint"
            onClick={() => setDismissedHints(unlockedHints)}
          >
            ×
          </button>
          <span>💡 Flying hint {unlockedHints}</span>
          <strong>{challenge.hints[unlockedHints - 1]}</strong>
          <small>Unlocked after {unlockedHints * 3} failed attempts</small>
        </aside>
      )}
    </div>
  );
}
