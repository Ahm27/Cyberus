"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { FormMessage } from "./form-message";
import styles from "./admin-console.module.css";

type Challenge = {
  id: string;
  number: number;
  title: string;
  description: string;
  instructions: string;
  hints: string[];
  explanation: string;
  difficulty: string;
  enabled: boolean;
  attempts: number;
  solves: number;
  hintsUnlocked: number;
  hintParticipants: number;
};

type Feedback = { kind: "success" | "error"; text: string } | null;

async function responseBody(response: Response) {
  return (await response.json().catch(() => ({}))) as { error?: string };
}

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function AdminConsole({
  event,
  challenges,
}: {
  event: { leaderboardEnabled: boolean };
  challenges: Challenge[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busyAction, setBusyAction] = useState("");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  async function saveChallenge(id: string, number: number, data: object) {
    setFeedback(null);
    setBusyAction(`challenge-${id}`);
    try {
      const response = await fetch(`/api/admin/challenges/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await responseBody(response);
      if (!response.ok)
        throw new Error(
          body.error || `Challenge ${number} could not be saved.`,
        );
      setFeedback({
        kind: "success",
        text: `Challenge ${String(number).padStart(2, "0")} saved successfully.`,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        kind: "error",
        text: friendlyError(
          error,
          `Challenge ${number} could not be saved. Try again.`,
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  async function toggleLeaderboard() {
    const nextState = !event.leaderboardEnabled;
    setFeedback(null);
    setBusyAction("leaderboard");
    try {
      const response = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leaderboardEnabled: nextState }),
      });
      const body = await responseBody(response);
      if (!response.ok)
        throw new Error(
          body.error || "The leaderboard setting could not be changed.",
        );
      setFeedback({
        kind: "success",
        text: nextState
          ? "The public leaderboard is now visible."
          : "The public leaderboard is now hidden.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        kind: "error",
        text: friendlyError(
          error,
          "The leaderboard setting could not be changed. Try again.",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  async function resetInstance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusyAction("reset-instance");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const challenge = challenges.find((item) => item.id === data.challengeId);
    try {
      const response = await fetch("/api/admin/rotate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await responseBody(response);
      if (!response.ok)
        throw new Error(
          body.error || "The participant challenge could not be reset.",
        );
      setFeedback({
        kind: "success",
        text: `${challenge?.title || "Challenge"} was reset for University ID ${data.universityId}. Their previous unsolved flag is no longer valid.`,
      });
      form.reset();
    } catch (error) {
      setFeedback({
        kind: "error",
        text: friendlyError(
          error,
          "The participant challenge could not be reset. Try again.",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className={styles.console}>
      <section className={styles.controlGrid} aria-label="Event controls">
        <article className={`card ${styles.controlCard}`}>
          <div className={styles.controlHeader}>
            <div>
              <p className="eyebrow">Participant visibility</p>
              <h2>Public leaderboard</h2>
            </div>
            <span
              className={`${styles.statePill} ${event.leaderboardEnabled ? "" : styles.off}`}
            >
              {event.leaderboardEnabled ? "Visible" : "Hidden"}
            </span>
          </div>
          <p className={styles.helperText}>
            Controls whether participants can view aliases and challenge totals
            on the public breach board.
          </p>
          <button
            className="btn secondary"
            onClick={toggleLeaderboard}
            disabled={busyAction === "leaderboard"}
          >
            {busyAction === "leaderboard"
              ? "Updating…"
              : event.leaderboardEnabled
                ? "Hide public leaderboard"
                : "Publish public leaderboard"}
          </button>
        </article>

        <article className={`card ${styles.controlCard}`}>
          <div className={styles.controlHeader}>
            <div>
              <p className="eyebrow">Participant entry</p>
              <h2>Registration QR code</h2>
            </div>
          </div>
          <div className={styles.qrLayout}>
            <div className={styles.qrFrame}>
              <QRCodeSVG
                value={appUrl}
                size={126}
                aria-label="Participant registration QR code"
              />
            </div>
            <div>
              <p className={styles.helperText}>
                Print this code for the event entrance. It opens the configured
                public platform address.
              </p>
              <p className={`mono ${styles.url}`}>{appUrl}</p>
              <button
                className="btn secondary no-print"
                onClick={() => window.print()}
              >
                Print registration QR
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.challengeSection}>
        <header className={styles.sectionHeader}>
          <div>
            <p className="eyebrow">Challenge configuration</p>
            <h2>Edit participant missions</h2>
          </div>
          <p className={styles.helperText}>
            Open a challenge to edit its participant-facing copy, hints,
            difficulty, and availability.
          </p>
        </header>

        {challenges.map((challenge) => (
          <details
            className={`card ${styles.challengeCard}`}
            key={challenge.id}
          >
            <summary className={styles.challengeSummary}>
              <div className={styles.challengeIdentity}>
                <span className={`mono ${styles.challengeNumber}`}>
                  {String(challenge.number).padStart(2, "0")}
                </span>
                <div>
                  <strong>{challenge.title}</strong>
                  <small>
                    {challenge.enabled
                      ? "Available to participants"
                      : "Hidden from participants"}
                  </small>
                </div>
              </div>
              <div className={styles.summaryMetrics}>
                <span className={styles.metricChip}>
                  {challenge.solves} solves
                </span>
                <span className={styles.metricChip}>
                  {challenge.attempts} attempts
                </span>
                <span className={`${styles.metricChip} ${styles.warning}`}>
                  {challenge.hintsUnlocked} hints · {challenge.hintParticipants}{" "}
                  learners
                </span>
              </div>
            </summary>

            <form
              className={styles.challengeForm}
              onSubmit={(event) => {
                event.preventDefault();
                const data = Object.fromEntries(
                  new FormData(event.currentTarget),
                );
                void saveChallenge(challenge.id, challenge.number, {
                  ...data,
                  enabled: data.enabled === "on",
                  hints: [data.hint1, data.hint2, data.hint3],
                });
              }}
            >
              <div className={styles.fieldGrid}>
                <label className={styles.fieldLabel}>
                  Challenge name
                  <input
                    className="field"
                    name="title"
                    defaultValue={challenge.title}
                    minLength={3}
                    maxLength={80}
                    required
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Card description
                  <textarea
                    className={`field ${styles.textArea}`}
                    name="shortDescription"
                    defaultValue={challenge.description}
                    minLength={10}
                    maxLength={240}
                    required
                  />
                </label>
                <label className={`${styles.fieldLabel} ${styles.wideField}`}>
                  Goal shown to participants
                  <small>State what learners must discover and submit.</small>
                  <textarea
                    className={`field ${styles.textArea}`}
                    name="instructions"
                    defaultValue={challenge.instructions}
                    minLength={10}
                    maxLength={2000}
                    required
                  />
                </label>
              </div>

              <div className={styles.hintGrid}>
                {challenge.hints.map((hint, index) => (
                  <label className={styles.fieldLabel} key={index}>
                    Hint {index + 1}
                    <textarea
                      className={`field ${styles.textArea}`}
                      name={`hint${index + 1}`}
                      defaultValue={hint}
                      minLength={2}
                      maxLength={300}
                      required
                    />
                  </label>
                ))}
              </div>

              <label className={styles.fieldLabel}>
                Explanation shown after solving
                <textarea
                  className={`field ${styles.textArea}`}
                  name="educationalExplanation"
                  defaultValue={challenge.explanation}
                  minLength={10}
                  maxLength={1200}
                  required
                />
              </label>

              <div className={styles.formActions}>
                <label className={styles.fieldLabel}>
                  Difficulty
                  <select
                    className={`field ${styles.select}`}
                    name="difficulty"
                    defaultValue={challenge.difficulty}
                  >
                    <option value="EASY">Easy</option>
                    <option value="EASY_MEDIUM">Easy / Medium</option>
                    <option value="MEDIUM">Medium</option>
                  </select>
                </label>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={challenge.enabled}
                  />
                  Available to participants
                </label>
                <button
                  className="btn"
                  disabled={busyAction === `challenge-${challenge.id}`}
                >
                  {busyAction === `challenge-${challenge.id}`
                    ? "Saving…"
                    : `Save challenge ${String(challenge.number).padStart(2, "0")}`}
                </button>
              </div>
            </form>
          </details>
        ))}
      </section>

      <section className={`card ${styles.resetCard}`}>
        <div>
          <p className="eyebrow">Participant support</p>
          <h2>Reset an unsolved challenge</h2>
          <p className={styles.helperText}>
            Use this only when a participant&apos;s active challenge is broken.
            Resetting generates a new flag and invalidates the previous one.
            Completed challenges cannot be reset.
          </p>
        </div>
        <form className={styles.resetForm} onSubmit={resetInstance}>
          <label className={styles.fieldLabel}>
            Participant University ID
            <input
              className="field"
              name="universityId"
              placeholder="Example: 202600123"
              minLength={3}
              maxLength={40}
              required
            />
          </label>
          <label className={styles.fieldLabel}>
            Challenge to reset
            <select className="field" name="challengeId" required>
              {challenges.map((challenge) => (
                <option value={challenge.id} key={challenge.id}>
                  {String(challenge.number).padStart(2, "0")} ·{" "}
                  {challenge.title}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" disabled={busyAction === "reset-instance"}>
            {busyAction === "reset-instance"
              ? "Resetting…"
              : "Generate new flag"}
          </button>
        </form>
      </section>

      {feedback && (
        <div className={styles.feedback} aria-live="polite">
          <FormMessage
            error={feedback.kind === "error" ? feedback.text : undefined}
            success={feedback.kind === "success" ? feedback.text : undefined}
          />
        </div>
      )}
    </div>
  );
}
