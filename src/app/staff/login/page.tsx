import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { StaffLoginForm } from "@/components/staff-login-form";
export default async function StaffLogin() {
  if (await getAdmin()) redirect("/staff/claim");
  return (
    <main className="shell" style={{ padding: "50px 0" }}>
      <section
        className="card"
        style={{ maxWidth: 480, margin: "auto", padding: 32 }}
      >
        <p className="eyebrow">Protected staff area</p>
        <h1>Staff sign in</h1>
        <StaffLoginForm />
      </section>
    </main>
  );
}
