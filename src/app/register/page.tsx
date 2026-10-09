import { RegistrationForm } from "@/components/registration-form";
export default function RegisterPage() {
  return (
    <main className="shell" style={{ padding: "30px 0 70px" }}>
      <section
        className="card"
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "clamp(20px,5vw,38px)",
        }}
      >
        <p className="eyebrow">Online mode</p>
        <h1 style={{ fontSize: "clamp(2rem,8vw,3.4rem)", margin: "10px 0" }}>
          Create your identity
        </h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.55 }}>
          Your hacker alias is public. Your name, phone, and university ID
          remain private and are used for event verification only.
        </p>
        <RegistrationForm />
      </section>
    </main>
  );
}
