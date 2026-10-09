import { cookies } from "next/headers";
import { db } from "./db";
import { hashSecret, randomToken } from "./security";

const participantCookie = "cyberus_session";
const adminCookie = "cyberus_staff";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function createParticipantSession(participantId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await db.participantSession.create({
    data: { participantId, tokenHash: hashSecret(token), expiresAt },
  });
  (await cookies()).set(participantCookie, token, {
    ...cookieOptions,
    expires: expiresAt,
  });
}
export async function getParticipant() {
  const token = (await cookies()).get(participantCookie)?.value;
  if (!token) return null;
  const session = await db.participantSession.findFirst({
    where: { tokenHash: hashSecret(token), expiresAt: { gt: new Date() } },
    include: { participant: true },
  });
  return session?.participant || null;
}
export async function clearParticipantSession() {
  const store = await cookies();
  const token = store.get(participantCookie)?.value;
  if (token)
    await db.participantSession.deleteMany({
      where: { tokenHash: hashSecret(token) },
    });
  store.delete(participantCookie);
}

export async function createAdminSession(adminId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.adminSession.create({
    data: { adminId, tokenHash: hashSecret(token), expiresAt },
  });
  (await cookies()).set(adminCookie, token, {
    ...cookieOptions,
    expires: expiresAt,
  });
}
export async function getAdmin() {
  const token = (await cookies()).get(adminCookie)?.value;
  if (!token) return null;
  const session = await db.adminSession.findFirst({
    where: {
      tokenHash: hashSecret(token),
      expiresAt: { gt: new Date() },
      admin: { active: true },
    },
    include: { admin: true },
  });
  return session?.admin || null;
}
export async function clearAdminSession() {
  const store = await cookies();
  const token = store.get(adminCookie)?.value;
  if (token)
    await db.adminSession.deleteMany({
      where: { tokenHash: hashSecret(token) },
    });
  store.delete(adminCookie);
}
