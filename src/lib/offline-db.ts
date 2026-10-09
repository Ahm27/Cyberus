"use client";
import { openDB } from "idb";

export type OfflineState = {
  id: string;
  createdAt: string;
  solved: number[];
  solvedAt: Record<number, string>;
  flags: Record<number, string>;
  failedAttempts: Record<number, number>;
};
const database = () =>
  openDB("cyberus-offline-v1", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
const randomChars = (length: number) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};
export async function getOfflineState() {
  const db = await database();
  let state = (await db.get("state", "participant")) as
    OfflineState | undefined;
  if (!state) {
    const flags = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        i + 1,
        `CYBERUS{${randomChars(12)}}`,
      ]),
    );
    state = {
      id: `OFF-${randomChars(6)}`,
      createdAt: new Date().toISOString(),
      solved: [],
      solvedAt: {},
      flags,
      failedAttempts: {},
    };
    await db.put("state", state, "participant");
  } else if (!state.failedAttempts) {
    state.failedAttempts = {};
    await db.put("state", state, "participant");
  }
  return state;
}
export async function recordOfflineFailure(number: number) {
  const db = await database();
  const state = await getOfflineState();
  state.failedAttempts[number] = (state.failedAttempts[number] || 0) + 1;
  await db.put("state", state, "participant");
  return state;
}
export async function solveOffline(number: number) {
  const db = await database();
  const state = await getOfflineState();
  if (!state.solved.includes(number)) {
    state.solved.push(number);
    state.solvedAt[number] = new Date().toISOString();
    await db.put("state", state, "participant");
  }
  return state;
}
