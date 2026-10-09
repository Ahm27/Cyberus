"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { FormMessage } from "./form-message";
type C = {
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
export function AdminConsole({
  event,
  challenges,
}: {
  event: { leaderboardEnabled: boolean };
  challenges: C[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  async function patch(id: string, data: object) {
    setMessage("");
    const r = await fetch(`/api/admin/challenges/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const d = await r.json();
    setMessage(r.ok ? "Changes saved." : d.error);
    if (r.ok) router.refresh();
  }
  async function toggleBoard() {
    const r = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leaderboardEnabled: !event.leaderboardEnabled }),
    });
    if (r.ok) router.refresh();
  }
  async function rotate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = await fetch("/api/admin/rotate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });
    const d = await r.json();
    setMessage(r.ok ? "Active challenge instance rotated." : d.error);
  }
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        className="card"
        style={{
          padding: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p className="eyebrow">Public ranking</p>
          <h2>
            Leaderboard {event.leaderboardEnabled ? "enabled" : "disabled"}
          </h2>
        </div>
        <button className="btn secondary" onClick={toggleBoard}>
          {event.leaderboardEnabled ? "Disable" : "Enable"}
        </button>
      </section>
      <section className="card" style={{ padding: 24 }}>
        <p className="eyebrow">Printable entry point</p>
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <QRCodeSVG
            value={appUrl}
            size={150}
            aria-label="Main platform QR code"
          />
          <div>
            <h2>Platform QR</h2>
            <p className="mono">{appUrl}</p>
            <button
              className="btn secondary no-print"
              onClick={() => window.print()}
            >
              Print QR
            </button>
          </div>
        </div>
      </section>
      <section>
        <h2>Challenge operations</h2>
        {challenges.map((c) => (
          <form
            key={c.id}
            className="card"
            style={{ padding: 18, marginBottom: 12, display: "grid", gap: 12 }}
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              patch(c.id, {
                ...data,
                enabled: data.enabled === "on",
                hints: [data.hint1, data.hint2, data.hint3],
              });
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <strong className="mono">
                {String(c.number).padStart(2, "0")}
              </strong>
              <span className="badge">
                {c.solves}/{c.attempts} ·{" "}
                {c.attempts ? Math.round((c.solves / c.attempts) * 100) : 0}%
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              <span className="badge gold">
                {c.hintsUnlocked} hints unlocked
              </span>
              <span>
                by {c.hintParticipants} participant
                {c.hintParticipants === 1 ? "" : "s"}
              </span>
            </div>
            <input
              className="field"
              name="title"
              defaultValue={c.title}
              aria-label={`Challenge ${c.number} title`}
            />
            <textarea
              className="field"
              name="shortDescription"
              defaultValue={c.description}
              aria-label={`Challenge ${c.number} short description`}
            />
            <textarea
              className="field"
              name="instructions"
              defaultValue={c.instructions}
              aria-label="Instructions"
            />
            {c.hints.map((hint, index) => (
              <input
                className="field"
                name={`hint${index + 1}`}
                defaultValue={hint}
                aria-label={`Hint ${index + 1}`}
                key={index}
              />
            ))}
            <textarea
              className="field"
              name="educationalExplanation"
              defaultValue={c.explanation}
              aria-label="Educational explanation"
            />
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                className="field"
                name="difficulty"
                defaultValue={c.difficulty}
                style={{ width: "auto" }}
                aria-label={`Challenge ${c.number} difficulty`}
              >
                <option value="EASY">Easy</option>
                <option value="EASY_MEDIUM">Easy / Medium</option>
                <option value="MEDIUM">Medium</option>
              </select>
              <label>
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={c.enabled}
                />{" "}
                Enabled
              </label>
              <button className="btn">Save</button>
            </div>
          </form>
        ))}
      </section>
      <section className="card" style={{ padding: 24 }}>
        <p className="eyebrow">Invalidate and regenerate</p>
        <h2>Rotate participant instance</h2>
        <form
          onSubmit={rotate}
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <input
            className="field"
            style={{ flex: "1 1 220px" }}
            name="universityId"
            placeholder="University ID"
            aria-label="Participant University ID"
            required
          />
          <select
            className="field"
            style={{ flex: "1 1 220px" }}
            name="challengeId"
            aria-label="Challenge to rotate"
          >
            {challenges.map((c) => (
              <option value={c.id} key={c.id}>
                {c.number}. {c.title}
              </option>
            ))}
          </select>
          <button className="btn">Rotate instance</button>
        </form>
      </section>
      <FormMessage success={message} />
    </div>
  );
}
