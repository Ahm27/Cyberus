"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FormMessage } from "./form-message";

export function RegistrationForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed");
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Connection lost. Try again or choose Offline Mode.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 26 }}>
      <label className="label">
        Full name
        <input
          className="field"
          name="fullName"
          required
          minLength={3}
          autoComplete="name"
        />
      </label>
      <label className="label">
        Phone number
        <input
          className="field"
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel"
        />
      </label>
      <label className="label">
        University ID
        <input
          className="field"
          name="universityId"
          required
          autoCapitalize="characters"
        />
      </label>
      <label className="label">
        Hacker alias{" "}
        <span style={{ fontWeight: 400, color: "var(--muted)" }}>
          Shown on the leaderboard
        </span>
        <input
          className="field mono"
          name="hackerAlias"
          required
          minLength={2}
          maxLength={24}
          autoComplete="nickname"
          placeholder="0xNewbie"
        />
      </label>
      <FormMessage error={error} />
      <button className="btn" disabled={loading}>
        {loading ? "Establishing session…" : "Start challenges"}
      </button>
    </form>
  );
}
