"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton({ staff = false }: { staff?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function logout() {
    setLoading(true);
    const response = await fetch(staff ? "/api/staff/logout" : "/api/logout", {
      method: "POST",
    }).catch(() => null);
    if (!response?.ok) {
      setLoading(false);
      return;
    }
    router.push(staff ? "/staff/login" : "/");
    router.refresh();
  }
  return (
    <button
      className="btn secondary"
      type="button"
      onClick={logout}
      disabled={loading}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
