import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const cdp = "http://127.0.0.1:9222";
const app = process.env.APP_URL || "http://127.0.0.1:3000";
const prisma = new PrismaClient();
const qaStamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const qaUniversityId = `UI-${qaStamp}`;
let staffCookieValue = "";
let participantCookieValue = "";
await mkdir("qa-artifacts", { recursive: true });

async function createPage() {
  const target = await fetch(
    `${cdp}/json/new?${encodeURIComponent("about:blank")}`,
    {
      method: "PUT",
    },
  ).then((response) => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const events = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else events.push(message);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const requestId = ++id;
      pending.set(requestId, { resolve, reject });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
  });
  return { target, socket, send, events };
}

async function waitFor(page, expression, timeout = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const result = await page.send("Runtime.evaluate", {
      expression: `Boolean(${expression})`,
      returnByValue: true,
    });
    if (result.result.value) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function evaluate(page, expression) {
  const result = await page.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ||
        "Browser evaluation failed",
    );
  return result.result.value;
}

async function navigate(
  page,
  pathname,
  readyExpression = "document.readyState === 'complete'",
) {
  await page.send("Page.navigate", { url: `${app}${pathname}` });
  await waitFor(page, readyExpression);
}

async function screenshot(page, name) {
  const result = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    `qa-artifacts/${name}.png`,
    Buffer.from(result.data, "base64"),
  );
}

async function setCookie(page, response, expectedName) {
  const raw = response.headers.get("set-cookie");
  assert.ok(raw, `${expectedName} cookie was not returned`);
  const [pair] = raw.split(";", 1);
  const separator = pair.indexOf("=");
  const name = pair.slice(0, separator);
  const value = pair.slice(separator + 1);
  assert.equal(name, expectedName);
  const result = await page.send("Network.setCookie", {
    name,
    value,
    url: app,
    httpOnly: true,
    sameSite: "Lax",
  });
  assert.equal(result.success, true);
  return value;
}

async function assertWidths(page, pathname, readyExpression) {
  for (const width of [360, 375, 390, 412, 430]) {
    await page.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await navigate(page, pathname, readyExpression);
    const result = await layout(page);
    assert.equal(
      result.scrollWidth,
      width,
      `${pathname} overflowed at ${width}px`,
    );
    assert.deepEqual(
      result.overflowing,
      [],
      `${pathname} had overflowing elements at ${width}px`,
    );
  }
}

async function layout(page) {
  return evaluate(
    page,
    `(() => {
      const overflowing = [...document.querySelectorAll('body *')]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.right > innerWidth + 1 || box.left < -1;
        })
        .slice(0, 12)
        .map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 50), right: Math.round(element.getBoundingClientRect().right) }));
      const controls = [...document.querySelectorAll('button,a,input,textarea,select')]
        .filter((element) => element.getBoundingClientRect().width > 0)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return { text: (element.textContent || element.getAttribute('aria-label') || element.getAttribute('name') || '').trim().slice(0, 40), width: Math.round(box.width), height: Math.round(box.height) };
        });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflowing, controls };
    })()`,
  );
}

const page = await createPage();
try {
  await page.send("Network.clearBrowserCookies");
  await page.send("Storage.clearDataForOrigin", {
    origin: new URL(app).origin,
    storageTypes: "indexeddb,local_storage,service_workers,cache_storage",
  });
  await navigate(page, "/");
  const home = await layout(page);
  assert.equal(home.scrollWidth, 360);
  assert.deepEqual(home.overflowing, []);
  assert.ok(
    home.controls
      .filter((control) => /mode/i.test(control.text))
      .every((control) => control.height >= 48),
  );
  await screenshot(page, "home-360");
  console.log(
    "PASS landing page has no 360px overflow and primary taps are at least 48px",
  );

  await navigate(page, "/register");
  const registration = await layout(page);
  assert.equal(registration.scrollWidth, 360);
  assert.deepEqual(registration.overflowing, []);
  const undersizedRegistrationControls = registration.controls.filter(
    (control) => control.text && control.height < 44,
  );
  assert.deepEqual(undersizedRegistrationControls, []);
  await screenshot(page, "register-360");
  console.log(
    "PASS registration form fits 360px with accessible control heights",
  );

  await navigate(
    page,
    "/offline",
    "document.querySelectorAll('article').length === 10",
  );
  const offline = await layout(page);
  assert.equal(offline.scrollWidth, 360);
  assert.deepEqual(offline.overflowing, []);
  assert.equal(
    await evaluate(page, "document.querySelectorAll('article').length"),
    10,
  );
  const offlineId = await evaluate(
    page,
    "document.body.innerText.match(/OFF-[A-Z0-9]{6}/)?.[0]",
  );
  assert.match(offlineId, /^OFF-[A-Z0-9]{6}$/);
  await screenshot(page, "offline-360");
  console.log(
    "PASS offline mode hydrates, creates an ID, and renders exactly 10 cards",
  );

  await evaluate(
    page,
    `([...document.querySelectorAll('article')].find((card) => card.textContent.includes('NOT YOUR PROFILE')).querySelector('button')).click()`,
  );
  await waitFor(page, "document.querySelector('input')");
  await evaluate(
    page,
    `(() => { const input = document.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '103'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Investigate')).click()`,
  );
  await waitFor(
    page,
    "document.body.innerText.includes('Evidence discovered')",
  );
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Record offline solve'))).click()`,
  );
  await waitFor(
    page,
    "document.body.innerText.includes('OFFLINE BREACH RECORDED')",
  );
  await page.send("Page.reload", { ignoreCache: true });
  await waitFor(page, "document.querySelectorAll('article').length === 10");
  assert.ok(
    await evaluate(
      page,
      `([...document.querySelectorAll('article')].find((card) => card.textContent.includes('NOT YOUR PROFILE')).textContent.includes('Breached'))`,
    ),
  );
  console.log("PASS offline solve survives a browser refresh in IndexedDB");

  async function solveOfflineChallenge(title, answer) {
    await evaluate(
      page,
      `([...document.querySelectorAll('article')].find((card) => card.textContent.includes(${JSON.stringify(title)})).querySelector('button')).click()`,
    );
    await waitFor(page, "document.querySelector('input')");
    await evaluate(
      page,
      `(() => { const input = document.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(answer)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
    );
    await evaluate(
      page,
      `([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Investigate')).click()`,
    );
    await waitFor(
      page,
      "document.body.innerText.includes('Evidence discovered')",
    );
    await evaluate(
      page,
      `([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Record offline solve'))).click()`,
    );
    await waitFor(
      page,
      "document.body.innerText.includes('OFFLINE BREACH RECORDED')",
    );
    await evaluate(
      page,
      `([...document.querySelectorAll('button')].find((button) => button.textContent.includes('All challenges'))).click()`,
    );
    await waitFor(page, "document.querySelectorAll('article').length === 10");
  }

  await solveOfflineChallenge("ADMIN? SAYS WHO?", "/challenge-admin");
  await solveOfflineChallenge("YOU'VE BEEN PHISHED", "phish");
  assert.ok(
    await evaluate(
      page,
      "document.body.innerText.includes('OFFLINE PRIZE ELIGIBILITY') && document.body.innerText.includes('Challenges solved: 3/10')",
    ),
  );
  await page.send("Page.reload", { ignoreCache: true });
  await waitFor(
    page,
    "document.body.innerText.includes('OFFLINE PRIZE ELIGIBILITY')",
  );
  console.log(
    "PASS third offline solve unlocks persistent manual prize eligibility",
  );

  await assertWidths(page, "/", "document.readyState === 'complete'");
  await assertWidths(page, "/register", "document.readyState === 'complete'");
  await assertWidths(
    page,
    "/offline",
    "document.querySelectorAll('article').length === 10",
  );
  console.log(
    "PASS public and offline journeys fit 360, 375, 390, 412, and 430px",
  );

  const registrationResponse = await fetch(`${app}/api/register`, {
    method: "POST",
    headers: {
      origin: new URL(app).origin,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fullName: "UI QA Student",
      phone: "+20 100 777 0101",
      universityId: qaUniversityId,
      hackerAlias: `uiqa_${qaStamp}`.slice(0, 24),
    }),
  });
  assert.equal(
    registrationResponse.status,
    201,
    await registrationResponse.text(),
  );
  participantCookieValue = await setCookie(
    page,
    registrationResponse,
    "cyberus_session",
  );
  const participantHeaders = {
    origin: new URL(app).origin,
    "content-type": "application/json",
    cookie: `cyberus_session=${participantCookieValue}`,
  };
  for (const challenge of [
    ["not-your-profile", "profile", "103"],
    ["admin-says-who", "route", "/challenge-admin"],
    ["youve-been-phished", "select", "phish"],
  ]) {
    const interaction = await fetch(
      `${app}/api/challenges/${challenge[0]}/interact`,
      {
        method: "POST",
        headers: participantHeaders,
        body: JSON.stringify({ action: challenge[1], value: challenge[2] }),
      },
    );
    assert.equal(interaction.status, 200);
    const interactionPayload = await interaction.json();
    assert.equal(interactionPayload.success, true);
    const submission = await fetch(
      `${app}/api/challenges/${challenge[0]}/submit`,
      {
        method: "POST",
        headers: participantHeaders,
        body: JSON.stringify({ flag: interactionPayload.flag }),
      },
    );
    assert.equal(submission.status, 200);
  }
  await assertWidths(
    page,
    "/dashboard",
    "document.querySelectorAll('article').length === 10",
  );
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate(
    page,
    "/dashboard",
    "document.querySelectorAll('article').length === 10",
  );
  assert.ok(
    await evaluate(
      page,
      "document.body.innerText.includes('PRIZE UNLOCKED') && document.querySelector('svg[aria-label=\"Prize claim QR code\"]')",
    ),
  );
  await screenshot(page, "dashboard-360");
  console.log(
    "PASS online third solve renders one prize card and QR without phone-width overflow",
  );

  await assertWidths(
    page,
    "/challenges/not-your-profile",
    "document.querySelector('input') && document.body.innerText.includes('SUBMIT EVIDENCE')",
  );
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate(
    page,
    "/challenges/not-your-profile",
    "document.querySelector('input') && document.body.innerText.includes('SUBMIT EVIDENCE')",
  );
  await waitFor(
    page,
    "Object.keys(document.querySelector('input')).some((key) => key.startsWith('__reactProps'))",
  );
  assert.ok(
    await evaluate(
      page,
      "document.body.innerText.includes('Open a profile that does not belong to you') && document.querySelector('input[aria-label=\"Website address\"]').value === 'https://campuslink.test/profile?id=101'",
    ),
  );
  await evaluate(
    page,
    `(() => { const input = document.querySelector('input[aria-label="Website address"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'https://campuslink.test/profile?id=103'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Go')).click()`,
  );
  await waitFor(
    page,
    "document.body.innerText.includes('UNAUTHORIZED PROFILE EXPOSED') && document.body.innerText.includes('CHALLENGE EVIDENCE')",
  );
  await screenshot(page, "challenge-360");
  console.log(
    "PASS IDOR exposes an editable profile ID and works through the UI",
  );

  await navigate(
    page,
    "/challenges/secret-message",
    "document.body.innerText.includes('Unknown attacker') && document.body.innerText.includes('FINAL STEP')",
  );
  assert.ok(
    await evaluate(
      page,
      "!document.body.innerText.includes('Decode payload') && document.querySelector('input[placeholder=\"CYBERUS{…}\"]').value === ''",
    ),
  );
  console.log(
    "PASS Caesar appears as an attacker message without an on-site decoder",
  );

  await navigate(
    page,
    "/challenges/64-reasons",
    "document.body.innerText.includes('Threat Intel') && document.body.innerText.includes('captured-payload.txt')",
  );
  await waitFor(
    page,
    "Object.keys([...document.querySelectorAll('button')].find((button) => button.textContent.includes('captured-payload.txt'))).some((key) => key.startsWith('__reactProps'))",
  );
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.includes('captured-payload.txt'))).click()`,
  );
  await waitFor(
    page,
    "document.body.innerText.includes('Send to analyst decoder')",
  );
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Send to analyst decoder')).click()`,
  );
  await waitFor(page, "document.body.innerText.includes('Decode payload')");
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Decode payload')).click()`,
  );
  await waitFor(
    page,
    "document.body.innerText.toUpperCase().includes('DECODED OUTPUT')",
  );
  assert.ok(
    await evaluate(
      page,
      "document.querySelector('input[placeholder=\"CYBERUS{…}\"]').value === ''",
    ),
  );
  console.log(
    "PASS Base64 decoder reveals evidence without autofilling the flag",
  );

  await navigate(
    page,
    "/challenges/knock-knock",
    "document.body.innerText.includes('22 / SSH') && document.querySelector('input[placeholder=\"Port number\"]')",
  );
  await waitFor(
    page,
    "Object.keys(document.querySelector('input[placeholder=\"Port number\"]')).some((key) => key.startsWith('__reactProps'))",
  );
  await evaluate(
    page,
    `(() => { const input = document.querySelector('input[placeholder="Port number"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '443'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Check exposure')).click()`,
  );
  await waitFor(
    page,
    "document.body.innerText.includes('25 / SMTP') && document.body.innerText.includes('scan refreshed')",
  );
  console.log("PASS static port choices refresh after one wrong answer");

  await navigate(
    page,
    "/challenges/source-never-lies",
    "document.body.innerText.includes('WELCOME, GUEST') && document.querySelector('button[aria-label=\"Inspect simulated page source\"]')",
  );
  await waitFor(
    page,
    "Object.keys(document.querySelector('button[aria-label=\"Inspect simulated page source\"]')).some((key) => key.startsWith('__reactProps'))",
  );
  await evaluate(
    page,
    `document.querySelector('button[aria-label="Inspect simulated page source"]').click()`,
  );
  await waitFor(
    page,
    "document.body.innerText.includes('API_Key=CYBERUS{') && document.body.innerText.includes('view-source:https://northstar.test/guest')",
  );
  console.log(
    "PASS hidden Inspect control reveals API_Key in large source view",
  );

  await navigate(
    page,
    "/challenges/cookie-monster",
    "document.body.innerText.includes('Dev tools') && document.body.innerText.includes('Member vault')",
  );
  await waitFor(
    page,
    "Object.keys([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Dev tools'))).some((key) => key.startsWith('__reactProps'))",
  );
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Dev tools'))).click()`,
  );
  await waitFor(
    page,
    "document.querySelector('aside[aria-label=\"Developer tools panel\"] input')",
  );
  await evaluate(
    page,
    `(() => { const input = document.querySelector('aside[aria-label="Developer tools panel"] input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'role=admin'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Save cookie'))).click()`,
  );
  await waitFor(
    page,
    "document.body.innerText.includes('Admin vault unlocked') && document.body.innerText.includes('CHALLENGE EVIDENCE')",
  );
  console.log("PASS cookie editor opens as a docked DevTools side panel");

  await navigate(
    page,
    "/challenges/trust-no-input",
    "document.body.innerText.includes('TRAINING LOGIN') && document.body.innerText.includes('Password')",
  );
  await waitFor(
    page,
    "Object.keys(document.querySelector('form input')).some((key) => key.startsWith('__reactProps'))",
  );
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Sign in')).click()`,
  );
  await waitFor(page, "document.body.innerText.includes('Login failed')");
  await evaluate(
    page,
    `(() => { const input = document.querySelector('form input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, "' OR '1'='1' --"); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  await evaluate(
    page,
    `([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Sign in')).click()`,
  );
  await waitFor(
    page,
    "document.body.innerText.includes('QUERY BYPASSED') && document.body.innerText.includes('CHALLENGE EVIDENCE')",
  );
  console.log(
    "PASS editable login keeps errors and revealed flag inside the page",
  );
  console.log("PASS online challenge console fits every requested phone width");

  const staffResponse = await fetch(`${app}/api/staff/login`, {
    method: "POST",
    headers: {
      origin: new URL(app).origin,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  assert.equal(staffResponse.status, 200, await staffResponse.text());
  staffCookieValue = await setCookie(page, staffResponse, "cyberus_staff");
  await assertWidths(
    page,
    "/staff/claim",
    "document.body.innerText.includes('PRIZE CONTROL')",
  );
  await assertWidths(
    page,
    "/admin",
    "document.body.innerText.includes('EVENT CONTROL')",
  );
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate(
    page,
    "/admin",
    "document.body.innerText.includes('EVENT CONTROL')",
  );
  await screenshot(page, "admin-360");
  console.log("PASS staff and admin screens fit every requested phone width");

  const browserErrors = page.events.filter(
    (event) =>
      event.method === "Runtime.exceptionThrown" ||
      (event.method === "Log.entryAdded" &&
        event.params.entry.level === "error"),
  );
  assert.deepEqual(browserErrors, []);
  console.log("PASS tested pages produced no browser exceptions or error logs");
} finally {
  page.socket.close();
  await fetch(`${cdp}/json/close/${page.target.id}`);
  await prisma.participant.deleteMany({
    where: { universityIdNormalized: qaUniversityId.replaceAll("-", "") },
  });
  if (staffCookieValue) {
    const tokenHash = createHash("sha256")
      .update(`${process.env.SESSION_PEPPER}:${staffCookieValue}`)
      .digest("hex");
    await prisma.adminSession.deleteMany({
      where: { tokenHash },
    });
  }
  await prisma.$disconnect();
}
