"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FormMessage } from "./form-message";
export function StaffLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push("/staff/claim");
      router.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <label className="label">
        Email
        <input
          className="field"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </label>
      <label className="label">
        Password
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <FormMessage error={error} />
      <button className="btn" disabled={loading}>
        {loading ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
