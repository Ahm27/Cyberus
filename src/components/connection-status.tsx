"use client";
import { useEffect, useState } from "react";
export function ConnectionStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    addEventListener("online", update);
    addEventListener("offline", update);
    return () => {
      removeEventListener("online", update);
      removeEventListener("offline", update);
    };
  }, []);
  return (
    <span className={`badge ${online ? "" : "gold"}`}>
      {online ? "Online" : "Connection unavailable"}
    </span>
  );
}
