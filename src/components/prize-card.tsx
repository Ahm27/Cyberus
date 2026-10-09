"use client";
import { QRCodeSVG } from "qrcode.react";
type Claim = { id: string; claimCode: string; claimedAt: Date | null };
export function PrizeCard({ claim }: { claim: Claim }) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return (
    <section
      className="card"
      style={{
        borderColor: "#e5ca6d",
        padding: "clamp(20px,5vw,34px)",
        marginTop: 18,
        background: "linear-gradient(135deg,#fffaf0,#fff)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 20,
          alignItems: "center",
        }}
      >
        <div>
          <span className="badge gold">
            {claim.claimedAt ? "Prize claimed" : "Prize unlocked"}
          </span>
          <h2 style={{ fontSize: "clamp(1.8rem,7vw,3rem)", margin: "12px 0" }}>
            {claim.claimedAt ? "PRIZE CLAIMED" : "ROOT ACCESS GRANTED"}
          </h2>
          <p style={{ color: "var(--muted)" }}>
            Show this screen to Cyberus HR.
          </p>
          <p
            className="mono"
            style={{ fontSize: 24, fontWeight: 900, letterSpacing: ".08em" }}
          >
            {claim.claimCode}
          </p>
        </div>
        <div style={{ background: "white", padding: 10, borderRadius: 12 }}>
          <QRCodeSVG
            value={`${base}/staff/claim?code=${encodeURIComponent(claim.id)}`}
            size={116}
            level="M"
            aria-label="Prize claim QR code"
          />
        </div>
      </div>
    </section>
  );
}
