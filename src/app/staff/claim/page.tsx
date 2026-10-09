import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdmin } from "@/lib/auth";
import { StaffClaimConsole } from "@/components/staff-claim-console";
import { LogoutButton } from "@/components/logout-button";
export default async function StaffClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/staff/login");
  const { code } = await searchParams;
  return (
    <main className="shell" style={{ maxWidth: 820, padding: "24px 0 70px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div>
          <p className="eyebrow">Authorized as {admin.name}</p>
          <h1 style={{ fontSize: "clamp(2.2rem,8vw,4rem)", margin: "8px 0" }}>
            PRIZE CONTROL
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn secondary" href="/admin">
            Admin
          </Link>
          <LogoutButton staff />
        </div>
      </div>
      <StaffClaimConsole initialCode={code || ""} />
    </main>
  );
}
