"use client";

import { useState } from "react";
import type { Puzzle } from "@/lib/challenge-engine";
import styles from "./challenge-simulator.module.css";

export type InteractionResult = {
  success: boolean;
  message: string;
  flag?: string;
  evidence?: string;
  failedAttempts?: number;
  unlockedHints?: number;
  attemptsUntilHint?: number;
};

type Props = {
  type: string;
  puzzle: Puzzle;
  value: string;
  loadedValue: string;
  loading: boolean;
  result: InteractionResult | null;
  scenario: number;
  unlockedHints: number;
  onChange: (value: string) => void;
  onRun: (action: string, value?: string) => void;
};

function BrowserChrome({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className={styles.browserChrome} aria-label={label}>
      <div className={styles.browserTopbar}>
        <div className={styles.windowDots} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className={styles.browserTab}>{label}</span>
        <span className={styles.browserMenu} aria-hidden="true">
          ⋮
        </span>
      </div>
      {children}
    </div>
  );
}

function AddressBar({
  value,
  loading,
  onChange,
  onGo,
}: {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onGo: () => void;
}) {
  return (
    <form
      className={styles.addressBar}
      onSubmit={(event) => {
        event.preventDefault();
        onGo();
      }}
    >
      <span className={styles.addressLock} aria-hidden="true">
        ◇
      </span>
      <input
        className={`${styles.addressInput} ${styles.fullAddress}`}
        aria-label="Website address"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button className={styles.goButton} type="submit" disabled={loading}>
        {loading ? "…" : "Go"}
      </button>
    </form>
  );
}

function FlagReveal({ flag }: { flag?: string }) {
  if (!flag) return null;
  return (
    <div className={styles.embeddedFlag}>
      <span>Challenge evidence</span>
      <strong>{flag}</strong>
      <small>Copy this flag and submit it below.</small>
    </div>
  );
}

function profileId(value: string) {
  try {
    return new URL(value).searchParams.get("id") || "";
  } catch {
    return value.trim();
  }
}

function routePath(value: string) {
  try {
    return new URL(value).pathname;
  } catch {
    return value.trim();
  }
}

function IdorSimulator(props: Props) {
  const [tab, setTab] = useState<"feed" | "people" | "profile">("profile");
  const id = profileId(props.loadedValue);
  const profile =
    id === "102"
      ? { initials: "OS", name: "Omar Saad", role: "Design student" }
      : id === "103" && props.result?.success
        ? { initials: "NF", name: "Nadia Fox", role: "Campus coordinator" }
        : id === "101"
          ? {
              initials: "MC",
              name: "Maya Chen",
              role: "Computer science student",
            }
          : null;

  return (
    <BrowserChrome label="CampusLink">
      <AddressBar
        {...props}
        onGo={() => {
          setTab("profile");
          props.onRun("profile");
        }}
      />
      <div className={styles.trainingRibbon}>
        <span>●</span> Isolated training site · fictional data
      </div>
      <div className={styles.siteViewport}>
        <header className={styles.campusHeader}>
          <button
            className={styles.campusBrand}
            type="button"
            onClick={() => setTab("feed")}
          >
            <span className={styles.campusMark}>C</span>CampusLink
          </button>
          <nav className={styles.campusNav} aria-label="CampusLink navigation">
            <button
              className={tab === "feed" ? styles.activeSiteTab : ""}
              onClick={() => setTab("feed")}
            >
              Feed
            </button>
            <button
              className={tab === "people" ? styles.activeSiteTab : ""}
              onClick={() => setTab("people")}
            >
              People
            </button>
            <button
              className={tab === "profile" ? styles.activeSiteTab : ""}
              onClick={() => setTab("profile")}
            >
              Profile
            </button>
          </nav>
          <span className={styles.miniAvatar}>MC</span>
        </header>
        {tab === "feed" ? (
          <main className={styles.simpleSitePage}>
            <p className={styles.kicker}>Campus feed</p>
            <h2>Welcome back, Maya</h2>
            <div className={styles.fakePanel}>
              Orientation photos and club updates appear here.
            </div>
          </main>
        ) : tab === "people" ? (
          <main className={styles.simpleSitePage}>
            <p className={styles.kicker}>Directory</p>
            <h2>People you may know</h2>
            <div className={styles.peopleGrid}>
              <button
                onClick={() => {
                  props.onChange("https://campuslink.test/profile?id=101");
                  setTab("profile");
                }}
              >
                Maya Chen · #101
              </button>
              <button
                onClick={() => {
                  props.onChange("https://campuslink.test/profile?id=102");
                  setTab("profile");
                }}
              >
                Omar Saad · #102
              </button>
            </div>
          </main>
        ) : profile ? (
          <main className={styles.profilePage}>
            {props.result?.success && id === "103" && (
              <div className={styles.unauthorizedBanner}>
                <strong>UNAUTHORIZED PROFILE EXPOSED</strong>
                <span>
                  You are signed in as Maya, but the server returned
                  Nadia&apos;s private record.
                </span>
              </div>
            )}
            <div className={styles.profileCover}>
              <span className={styles.recordTag}>RECORD #{id}</span>
            </div>
            <section className={styles.profileContent}>
              <div className={styles.profileAvatar}>{profile.initials}</div>
              <div className={styles.profileTitle}>
                <p className={styles.kicker}>Campus profile</p>
                <h2>{profile.name}</h2>
                <p>{profile.role}</p>
              </div>
              <button className={styles.followButton} type="button">
                Message
              </button>
            </section>
            <div className={styles.profileGrid}>
              <section className={styles.fakePanel}>
                <p className={styles.panelLabel}>About</p>
                <p>
                  Cyberus University community member. Building, learning, and
                  sharing on campus.
                </p>
              </section>
              <section
                className={`${styles.fakePanel} ${props.result?.success ? styles.privatePanel : ""}`}
              >
                <p className={styles.panelLabel}>
                  {props.result?.success
                    ? "Private note — exposed"
                    : "Activity"}
                </p>
                <p>
                  {props.result?.success
                    ? "This private record was returned without an ownership check."
                    : "No recent public activity."}
                </p>
                {props.result?.success && (
                  <FlagReveal flag={props.result.flag} />
                )}
              </section>
            </div>
          </main>
        ) : (
          <main className={styles.emptyState}>
            <span className={styles.emptyIcon}>404</span>
            <h2>Profile not found</h2>
            <p>Edit the address and try another fictional profile ID.</p>
          </main>
        )}
      </div>
    </BrowserChrome>
  );
}

function AccessControlSimulator(props: Props) {
  const [section, setSection] = useState("overview");
  const path = routePath(props.loadedValue).toLowerCase();
  const adminOpen = path === "/challenge-admin" && props.result?.success;
  const homeOpen = path === "/home";
  return (
    <BrowserChrome label="NovaDesk">
      <AddressBar {...props} onGo={() => props.onRun("route")} />
      <div className={styles.trainingRibbon}>
        <span>●</span> Isolated training site · no real admin system
      </div>
      <div className={`${styles.siteViewport} ${styles.deskViewport}`}>
        <aside className={styles.deskSidebar}>
          <div className={styles.deskBrand}>
            <span>N</span>
            <strong>NovaDesk</strong>
          </div>
          <nav>
            {["overview", "projects", "team", "reports"].map((item) => (
              <button
                key={item}
                className={section === item ? styles.activeNav : ""}
                onClick={() => setSection(item)}
              >
                {item === "overview" ? "⌂" : "□"}{" "}
                <b>{item[0].toUpperCase() + item.slice(1)}</b>
              </button>
            ))}
          </nav>
          <div className={styles.deskUser}>
            <span>ST</span>
            <div>
              <strong>Student</strong>
              <small>Member</small>
            </div>
          </div>
        </aside>
        <main className={styles.deskMain}>
          {adminOpen ? (
            <>
              <div className={styles.unauthorizedBanner}>
                <strong>UNAUTHORIZED ADMIN ACCESS</strong>
                <span>
                  NovaDesk loaded this restricted route without checking your
                  Student role.
                </span>
              </div>
              <header className={styles.deskPageHeader}>
                <div>
                  <p className={styles.kicker}>Restricted area</p>
                  <h2>Admin control room</h2>
                </div>
                <span className={styles.exposedBadge}>ACCESS EXPOSED</span>
              </header>
              <div className={styles.metricGrid}>
                <article>
                  <span>Active users</span>
                  <strong>248</strong>
                  <small>+12 this week</small>
                </article>
                <article>
                  <span>Open tickets</span>
                  <strong>19</strong>
                  <small>4 need review</small>
                </article>
                <article>
                  <span>System health</span>
                  <strong>99.9%</strong>
                  <small>All services online</small>
                </article>
              </div>
              <section className={styles.adminTable}>
                <div className={styles.tableHeader}>
                  <strong>Security evidence</strong>
                  <span>Admin only</span>
                </div>
                <div>
                  <FlagReveal flag={props.result?.flag} />
                </div>
              </section>
            </>
          ) : homeOpen ? (
            <>
              <header className={styles.deskPageHeader}>
                <div>
                  <p className={styles.kicker}>Student workspace</p>
                  <h2>
                    {section === "overview"
                      ? "Good morning, Student"
                      : section[0].toUpperCase() + section.slice(1)}
                  </h2>
                </div>
              </header>
              <div className={styles.metricGrid}>
                <article>
                  <span>My projects</span>
                  <strong>6</strong>
                  <small>2 due this week</small>
                </article>
                <article>
                  <span>Tasks complete</span>
                  <strong>73%</strong>
                  <small>Keep it going</small>
                </article>
                <article>
                  <span>Team messages</span>
                  <strong>4</strong>
                  <small>2 unread</small>
                </article>
              </div>
              <section className={styles.activityPanel}>
                <p className={styles.panelLabel}>Recent activity</p>
                <div>
                  <span className={styles.activityIcon}>✓</span>
                  <p>
                    <strong>Website refresh</strong>
                    <small>Task completed · 20 min ago</small>
                  </p>
                </div>
                <div>
                  <span className={styles.activityIcon}>↗</span>
                  <p>
                    <strong>Research board</strong>
                    <small>File shared · 2 hours ago</small>
                  </p>
                </div>
              </section>
            </>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>404</span>
              <h2>Page not found</h2>
              <p>
                The route is not linked from this dashboard. Edit the whole
                address above.
              </p>
            </div>
          )}
        </main>
      </div>
    </BrowserChrome>
  );
}

function AttackerMessage({
  encoded,
  showHelper,
}: {
  encoded?: string;
  showHelper: boolean;
}) {
  const [helperValue, setHelperValue] = useState(encoded || "");
  const [decoded, setDecoded] = useState("");

  function decodeCaesar() {
    setDecoded(
      helperValue
        .toUpperCase()
        .replace(/[A-Z0-9]/g, (character) =>
          /\d/.test(character)
            ? String((Number(character) + 7) % 10)
            : String.fromCharCode(
                ((character.charCodeAt(0) - 65 + 23) % 26) + 65,
              ),
        ),
    );
  }

  return (
    <div className={styles.secretMessageStack}>
      <div className={styles.phoneShell}>
        <div className={styles.phoneHeader}>
          <span>‹</span>
          <div>
            <strong>Unknown attacker</strong>
            <small>online</small>
          </div>
          <span>•••</span>
        </div>
        <div className={styles.chatBody}>
          <div className={styles.attackerBubble}>
            <span>ATTACKER · NOW</span>
            <p>I intercepted this. Decode it if you can:</p>
            <code>{encoded}</code>
          </div>
          <div className={styles.chatNotice}>
            Messages in this training chat are fictional.
          </div>
        </div>
        <div className={styles.chatComposer}>
          <span>Message</span>
          <button type="button">↑</button>
        </div>
      </div>
      {showHelper && (
        <section className={styles.caesarHelper} aria-label="Caesar helper">
          <div>
            <span>Hint 3 unlocked</span>
            <h3>Built-in Caesar helper</h3>
            <p>Shift every letter and digit back by 3.</p>
          </div>
          <label>
            Encoded message
            <textarea
              value={helperValue}
              onChange={(event) => setHelperValue(event.target.value)}
            />
          </label>
          <button type="button" onClick={decodeCaesar}>
            Decode with shift −3
          </button>
          {decoded && (
            <div className={styles.toolOutput}>
              <span>Decoded output</span>
              <code>{decoded}</code>
              <small>Copy the result and submit it manually below.</small>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const mailScenarios = [
  [
    {
      from: "library@university.edu",
      subject: "Book due Friday",
      body: "Return your book or renew it from your saved library bookmark.",
    },
    {
      from: "security@cyberus-support.co",
      subject: "Account expires in 10 minutes",
      body: "URGENT: Reply with your password now to keep access.",
    },
    {
      from: "events@cyberus.edu",
      subject: "Orientation schedule",
      body: "Orientation begins at 10:00. No action is required.",
    },
  ],
  [
    {
      from: "registrar@cyberus.edu",
      subject: "Enrollment confirmed",
      body: "Your enrollment is complete. No action is required.",
    },
    {
      from: "accounts@cyberus-alerts.co",
      subject: "Unusual sign-in — verify now",
      body: "Send your password within five minutes or your account will be locked.",
    },
    {
      from: "clubs@cyberus.edu",
      subject: "Club fair map",
      body: "See you in the main hall. The map is on the student portal.",
    },
  ],
];

function MailSimulator(props: Props) {
  const [selected, setSelected] = useState(0);
  const messages = mailScenarios[props.scenario];
  const message = messages[selected];
  return (
    <div className={styles.appSimulator}>
      <aside className={styles.mailSidebar}>
        <strong>✉ Mailbox</strong>
        <button type="button" className={styles.activeNav}>
          Inbox · 3
        </button>
        <button type="button">Starred</button>
        <button type="button">Sent</button>
      </aside>
      <div className={styles.mailApp}>
        <header>
          <div>
            <p className={styles.kicker}>Inbox investigation</p>
            <h2>Which sender is phishing?</h2>
          </div>
          <span>
            {props.scenario
              ? "Inbox refreshed after wrong answer"
              : "3 messages"}
          </span>
        </header>
        <div className={styles.mailGrid}>
          <div className={styles.mailList}>
            {messages.map((mail, index) => (
              <button
                key={mail.from}
                className={selected === index ? styles.selectedMail : ""}
                onClick={() => setSelected(index)}
              >
                <strong>{mail.from}</strong>
                <span>{mail.subject}</span>
              </button>
            ))}
          </div>
          <article className={styles.mailPreview}>
            <p className={styles.panelLabel}>From: {message.from}</p>
            <h3>{message.subject}</h3>
            <p>{message.body}</p>
          </article>
        </div>
        <form
          className={styles.answerBar}
          onSubmit={(event) => {
            event.preventDefault();
            props.onRun("select");
          }}
        >
          <label>
            Enter the phisher&apos;s full email address
            <input
              value={props.value}
              onChange={(event) => props.onChange(event.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <button disabled={props.loading}>Investigate</button>
        </form>
        {props.result?.success && <FlagReveal flag={props.result.flag} />}
      </div>
    </div>
  );
}

const networkScenarios = [
  [
    { name: "Main router", ip: "192.168.1.1", service: "53 DNS", safe: true },
    { name: "Lab printer", ip: "192.168.1.5", service: "631 IPP", safe: true },
    {
      name: "Student kiosk",
      ip: "192.168.1.20",
      service: "3389 RDP",
      safe: false,
    },
  ],
  [
    { name: "Gateway", ip: "10.0.0.1", service: "53 DNS", safe: true },
    { name: "Media screen", ip: "10.0.0.18", service: "443 HTTPS", safe: true },
    { name: "Reception PC", ip: "10.0.0.42", service: "3389 RDP", safe: false },
  ],
];

function RouterSimulator(props: Props) {
  const devices = networkScenarios[props.scenario];
  return (
    <BrowserChrome label="Orbit Router Admin">
      <div className={styles.routerHeader}>
        <div>
          <strong>ORBIT</strong>
          <span>Router Admin</span>
        </div>
        <span className={styles.onlinePill}>● Internet online</span>
      </div>
      <div className={styles.routerBody}>
        <aside>
          <button className={styles.activeNav}>Connected devices</button>
          <button>Wi-Fi settings</button>
          <button>Firewall</button>
          <button>System</button>
        </aside>
        <main>
          <header>
            <p className={styles.kicker}>Live network map</p>
            <h2>Connected devices</h2>
            <span>{props.scenario ? "Inventory refreshed" : "3 online"}</span>
          </header>
          <div className={styles.deviceTable}>
            {devices.map((device) => (
              <div key={device.ip}>
                <span className={device.safe ? styles.safeDot : styles.riskDot}>
                  ●
                </span>
                <strong>{device.name}</strong>
                <code>{device.ip}</code>
                <span>{device.service}</span>
              </div>
            ))}
          </div>
          <form
            className={styles.answerBar}
            onSubmit={(event) => {
              event.preventDefault();
              props.onRun("select");
            }}
          >
            <label>
              IP address exposing an unsafe remote-control service
              <input
                value={props.value}
                onChange={(event) => props.onChange(event.target.value)}
                placeholder="0.0.0.0"
                inputMode="decimal"
              />
            </label>
            <button disabled={props.loading}>Inspect host</button>
          </form>
          {props.result?.success && <FlagReveal flag={props.result.flag} />}
        </main>
      </div>
    </BrowserChrome>
  );
}

function Base64Simulator({ puzzle }: Props) {
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [decoderOpen, setDecoderOpen] = useState(false);
  const [decoded, setDecoded] = useState("");
  return (
    <div className={styles.secretMessageStack}>
      <div className={styles.phoneShell}>
        <div className={styles.phoneHeader}>
          <span>‹</span>
          <div>
            <strong>Threat Intel</strong>
            <small>secure channel</small>
          </div>
          <span>•••</span>
        </div>
        <div className={styles.chatBody}>
          <div className={styles.intelBubble}>
            <span>THREAT INTEL · NOW</span>
            <p>
              We captured an encoded payload. Open the attachment and identify
              what it contains.
            </p>
            <button
              type="button"
              className={styles.messageAttachment}
              onClick={() => setAttachmentOpen((open) => !open)}
            >
              <span>64</span>
              <div>
                <strong>captured-payload.txt</strong>
                <small>
                  {attachmentOpen ? "Close attachment" : "Tap to open"}
                </small>
              </div>
            </button>
            {attachmentOpen && (
              <div className={styles.attachmentContent}>
                <code>{puzzle.encoded}</code>
                <button type="button" onClick={() => setDecoderOpen(true)}>
                  Send to analyst decoder
                </button>
              </div>
            )}
          </div>
          <div className={styles.chatNotice}>
            Secure training message · encoded does not mean encrypted
          </div>
        </div>
        <div className={styles.chatComposer}>
          <span>Reply to Threat Intel</span>
          <button type="button">↑</button>
        </div>
      </div>
      {decoderOpen && (
        <section
          className={styles.caesarHelper}
          aria-label="Base64 analyst decoder"
        >
          <div>
            <span>Analyst tool</span>
            <h3>Base64 payload decoder</h3>
            <p>Decode the attachment and inspect its plain-text contents.</p>
          </div>
          <label>
            Attachment contents
            <textarea readOnly value={puzzle.encoded || ""} />
          </label>
          <button
            type="button"
            onClick={() => {
              try {
                setDecoded(atob(puzzle.encoded || ""));
              } catch {
                setDecoded("Invalid Base64 payload");
              }
            }}
          >
            Decode payload
          </button>
          {decoded && (
            <div className={styles.toolOutput}>
              <span>Decoded output</span>
              <code>{decoded}</code>
              <small>Copy the decoded flag and submit it manually below.</small>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function PortSimulator(props: Props) {
  const choices =
    props.scenario === 0
      ? [
          { value: "22", label: "22 / SSH", detail: "Remote shell" },
          { value: "80", label: "80 / HTTP", detail: "Public website" },
          { value: "443", label: "443 / HTTPS", detail: "Secure website" },
          {
            value: "3306",
            label: "3306 / MySQL",
            detail: "Database service",
          },
        ]
      : [
          { value: "25", label: "25 / SMTP", detail: "Mail transfer" },
          { value: "110", label: "110 / POP3", detail: "Mail retrieval" },
          { value: "8080", label: "8080 / HTTP", detail: "Web proxy" },
          {
            value: "3306",
            label: "3306 / MySQL",
            detail: "Database service",
          },
        ];
  return (
    <div className={styles.toolSimulator}>
      <div className={styles.toolHeader}>
        <span>↔</span>
        <div>
          <strong>Service Exposure Monitor</strong>
          <small>
            Public web server · 4 open ports
            {props.scenario ? " · scan refreshed" : ""}
          </small>
        </div>
      </div>
      <div className={styles.portGrid}>
        {choices.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => props.onChange(option.value)}
          >
            <strong>{option.label}</strong>
            <small>{option.detail}</small>
          </button>
        ))}
      </div>
      <form
        className={styles.answerBar}
        onSubmit={(event) => {
          event.preventDefault();
          props.onRun("select");
        }}
      >
        <label>
          Port that should be restricted
          <input
            value={props.value}
            onChange={(event) => props.onChange(event.target.value)}
            inputMode="numeric"
            placeholder="Port number"
          />
        </label>
        <button disabled={props.loading}>Check exposure</button>
      </form>
      {props.result?.success && <FlagReveal flag={props.result.flag} />}
    </div>
  );
}

function CookieSimulator(props: Props) {
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  return (
    <BrowserChrome label="VaultBox">
      <AddressBar
        value="https://vaultbox.test/vault"
        loading={false}
        onChange={() => {}}
        onGo={() => {}}
      />
      <div className={styles.vaultPage}>
        <button
          type="button"
          className={styles.devToolsButton}
          onClick={() => setDevToolsOpen(true)}
          aria-expanded={devToolsOpen}
        >
          🛠 Dev tools
        </button>
        <div className={styles.vaultCard}>
          <span>{props.result?.success ? "🔓" : "🔒"}</span>
          <h2>
            {props.result?.success ? "Admin vault unlocked" : "Member vault"}
          </h2>
          <p>
            {props.result?.success
              ? "VaultBox trusted the role stored in your browser cookie."
              : "Your current browser role does not have access."}
          </p>
          {props.result && !props.result.success && (
            <div className={styles.loginError}>{props.result.message}</div>
          )}
          {props.result?.success && <FlagReveal flag={props.result.flag} />}
        </div>
        {devToolsOpen && (
          <aside className={styles.devtools} aria-label="Developer tools panel">
            <header>
              <span>🔒 Docked DevTools</span>
              <button
                type="button"
                aria-label="Close developer tools"
                onClick={() => setDevToolsOpen(false)}
              >
                ×
              </button>
            </header>
            <strong>Application › Storage › Cookies</strong>
            <div className={styles.cookieTableHeader}>
              <span>Name</span>
              <span>Value</span>
            </div>
            <div className={styles.cookieRow}>
              <code>role</code>
              <label>
                <span>Cookie value</span>
                <input
                  value={props.value}
                  onChange={(event) => props.onChange(event.target.value)}
                />
              </label>
            </div>
            <button
              onClick={() => props.onRun("cookie")}
              disabled={props.loading}
            >
              Save cookie & reload vault
            </button>
          </aside>
        )}
      </div>
    </BrowserChrome>
  );
}

function SourceSimulator(props: Props) {
  return (
    <BrowserChrome label="Northstar Guest Portal">
      <AddressBar
        value="https://northstar.test/guest"
        loading={false}
        onChange={() => {}}
        onGo={() => {}}
      />
      <div className={styles.guestPage}>
        <header className={styles.guestHeader}>
          <strong>
            <span>N</span> Northstar
          </strong>
          <nav>
            <button type="button">About</button>
            <button type="button">Campus</button>
            <button type="button">Contact</button>
          </nav>
          <button type="button" className={styles.guestSignIn}>
            Sign in
          </button>
        </header>
        <main>
          <section className={styles.guestHero}>
            <div>
              <span>WELCOME, GUEST</span>
              <h2>Discover your next chapter.</h2>
              <p>
                Explore campus life, upcoming events, and resources available to
                every visitor.
              </p>
              <button type="button">Explore campus</button>
            </div>
            <div
              className={styles.guestPhoto}
              aria-label="Abstract campus illustration"
            >
              <span>
                Northstar
                <br />
                Open Day
              </span>
            </div>
          </section>
          <section className={styles.guestCards}>
            <article>
              <span>01</span>
              <strong>Plan your visit</strong>
              <p>Find directions and visitor information.</p>
            </article>
            <article>
              <span>02</span>
              <strong>Upcoming events</strong>
              <p>See what is happening around campus.</p>
            </article>
            <article>
              <span>03</span>
              <strong>Student stories</strong>
              <p>Meet the people building our community.</p>
            </article>
          </section>
        </main>
        <footer className={styles.guestFooter}>
          <span>© 2026 Northstar University</span>
          <button
            type="button"
            className={styles.hiddenInspect}
            aria-label="Inspect simulated page source"
            onClick={() => props.onRun("inspect", "")}
            disabled={props.loading}
          >
            ⌘ inspect
          </button>
        </footer>
        {props.result?.success && (
          <div className={styles.sourceOverlay}>
            <div className={styles.sourceWindow}>
              <header>
                <span>view-source:https://northstar.test/guest</span>
                <strong>HTML</strong>
              </header>
              <pre>
                <code>{`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Northstar Guest Portal</title>
    <link rel="stylesheet" href="/assets/guest.css" />
  </head>
  <body>
    <header data-mode="guest">Northstar University</header>
    <main id="visitor-content">
      <h1>Discover your next chapter.</h1>
      <section data-feed="public-events"></section>
    </main>
    <script>
      const API_HOST = "https://api.northstar.test";
      const API_Key=${props.result.flag};
      window.guestPortal = { mode: "public" };
    </script>
  </body>
</html>`}</code>
              </pre>
              <p>
                Find the exposed API key in the source and submit its value
                below.
              </p>
            </div>
          </div>
        )}
      </div>
    </BrowserChrome>
  );
}

function SqlSimulator(props: Props) {
  const [password, setPassword] = useState("student-password");
  return (
    <div className={styles.loginSimulator}>
      <div className={styles.loginBrand}>
        <span>Q</span>
        <strong>QueryGate</strong>
      </div>
      <div className={styles.loginCard}>
        <p className={styles.kicker}>Training login</p>
        <h2>Sign in</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            props.onRun(
              "login",
              JSON.stringify({ username: props.value, password }),
            );
          }}
        >
          <label>
            Username
            <input
              value={props.value}
              onChange={(event) => props.onChange(event.target.value)}
              autoCapitalize="none"
            />
          </label>
          <label>
            Password
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <button disabled={props.loading}>Sign in</button>
        </form>
        {props.result && !props.result.success && (
          <div className={styles.loginError} role="alert">
            <strong>Login failed</strong>
            <span>{props.result.message}</span>
          </div>
        )}
        {props.result?.success && (
          <div className={styles.loginSuccess}>
            <div className={styles.unauthorizedBanner}>
              <strong>QUERY BYPASSED</strong>
              <span>The simulated condition evaluated as true.</span>
            </div>
            <h3>Welcome, administrator</h3>
            <p>
              The login page returned a protected session without valid
              credentials.
            </p>
          </div>
        )}
        {props.result?.success && <FlagReveal flag={props.result.flag} />}
      </div>
    </div>
  );
}

export function ChallengeSimulator(props: Props) {
  switch (props.type) {
    case "IDOR":
      return <IdorSimulator {...props} />;
    case "ACCESS_CONTROL":
      return <AccessControlSimulator {...props} />;
    case "CAESAR":
      return (
        <AttackerMessage
          encoded={props.puzzle.encoded}
          showHelper={props.unlockedHints >= 3}
        />
      );
    case "BASE64":
      return <Base64Simulator {...props} />;
    case "PHISHING":
      return <MailSimulator {...props} />;
    case "NETWORK":
      return <RouterSimulator {...props} />;
    case "PORTS":
      return <PortSimulator {...props} />;
    case "CLIENT_TRUST":
      return <CookieSimulator {...props} />;
    case "SOURCE":
      return <SourceSimulator {...props} />;
    case "SQLI":
      return <SqlSimulator {...props} />;
    default:
      return null;
  }
}
