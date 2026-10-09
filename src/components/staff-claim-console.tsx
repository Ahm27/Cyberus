"use client";
import { FormEvent, useState } from "react";
import { FormMessage } from "./form-message";
type Result = {
  id: string;
  fullName: string;
  hackerAlias: string;
  universityId: string;
  solved: number;
  eligible: boolean;
  claimCode: string;
  claimedAt: string | null;
};
export function StaffClaimConsole({ initialCode }: { initialCode: string }) {
  const [query, setQuery] = useState(initialCode);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function search(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    setSuccess("");
    const r = await fetch(`/api/staff/claim?q=${encodeURIComponent(query)}`);
    const d = await r.json();
    if (!r.ok) {
      setResult(null);
      setError(d.error);
      return;
    }
    setResult(d);
  }
  async function redeem() {
    if (!result) return;
    const r = await fetch("/api/staff/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ claimId: result.id }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setResult({ ...result, claimedAt: d.claimedAt });
    setSuccess("PRIZE CLAIMED · Atomic redemption recorded.");
  }
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section className="card" style={{ padding: 24 }}>
        <p className="eyebrow">Online claim</p>
        <form
          onSubmit={search}
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <input
            className="field mono"
            style={{ flex: "1 1 260px" }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Claim code or University ID"
            aria-label="Claim code or University ID"
          />
          <button className="btn">Find claim</button>
        </form>
        <FormMessage error={error} success={success} />
        {result && (
          <div
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: "1px solid var(--line)",
            }}
          >
            <div className="grid-cards">
              <div>
                <p className="eyebrow">Participant</p>
                <h2>{result.fullName}</h2>
                <p>
                  {result.hackerAlias} · {result.universityId}
                </p>
              </div>
              <div>
                <p className="eyebrow">Verification</p>
                <h2>{result.solved}/10 SOLVED</h2>
                <span className={`badge ${result.eligible ? "gold" : ""}`}>
                  {result.eligible ? "Eligible ✓" : "Not eligible"}
                </span>
              </div>
            </div>
            <p className="mono">{result.claimCode}</p>
            <button
              className="btn gold"
              disabled={!result.eligible || Boolean(result.claimedAt)}
              onClick={redeem}
            >
              {result.claimedAt
                ? `Claimed ${new Date(result.claimedAt).toLocaleString()}`
                : "Mark as claimed"}
            </button>
          </div>
        )}
      </section>
      <OfflineClaimForm />
    </div>
  );
}
function OfflineClaimForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const form = e.currentTarget;
    const r = await fetch("/api/staff/offline-claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setSuccess("OFFLINE VERIFIED · Prize redemption registered.");
    form.reset();
  }
  return (
    <section className="card" style={{ padding: 24 }}>
      <p className="eyebrow">Manual trust workflow</p>
      <h2>Register offline participant</h2>
      <p style={{ color: "var(--muted)" }}>
        Confirm the participant’s offline eligibility screen in person before
        submitting.
      </p>
      <form onSubmit={submit} className="grid-cards">
        <label className="label">
          Full name
          <input className="field" name="fullName" required />
        </label>
        <label className="label">
          Phone
          <input className="field" name="phone" required />
        </label>
        <label className="label">
          University ID
          <input className="field" name="universityId" required />
        </label>
        <label className="label">
          Offline Participant ID
          <input
            className="field mono"
            name="offlineParticipantId"
            placeholder="OFF-A7K9P2"
            required
          />
        </label>
        <button className="btn gold">Verify and register claim</button>
      </form>
      <FormMessage error={error} success={success} />
    </section>
  );
}
