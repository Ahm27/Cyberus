import { ChallengeType } from "@prisma/client";

export type Puzzle = {
  kind: ChallengeType;
  prompt: string;
  options?: { value: string; label: string; detail?: string }[];
  encoded?: string;
  initial?: string;
};

const caesar = (text: string, shift: number) =>
  text.replace(/[A-Z0-9]/g, (char) => {
    if (/\d/.test(char)) return String((Number(char) + shift + 10) % 10);
    return String.fromCharCode(
      ((char.charCodeAt(0) - 65 + shift + 26) % 26) + 65,
    );
  });

function fictionalUrl(value: string, host: string) {
  try {
    const url = new URL(value);
    return url.hostname === host ? url : null;
  } catch {
    return null;
  }
}

function profileId(value: string) {
  if (/^\d+$/.test(value.trim())) return value.trim();
  return (
    fictionalUrl(value.trim(), "campuslink.test")?.searchParams.get("id") || ""
  );
}

function routePath(value: string) {
  if (value.trim().startsWith("/")) return value.trim();
  return fictionalUrl(value.trim(), "novadesk.test")?.pathname || "";
}

export function getPuzzle(type: ChallengeType, flag: string): Puzzle {
  switch (type) {
    case "IDOR":
      return {
        kind: type,
        prompt: "Change the profile URL to find a record you do not own.",
        initial: "https://campuslink.test/profile?id=101",
      };
    case "ACCESS_CONTROL":
      return {
        kind: type,
        prompt: "Find the hidden admin route by editing the address.",
        initial: "https://novadesk.test/home",
      };
    case "CAESAR":
      return {
        kind: type,
        prompt: "Intercepted ciphertext (shift +3)",
        encoded: caesar(flag, 3),
      };
    case "BASE64":
      return {
        kind: type,
        prompt: "Captured Base64 payload",
        encoded: Buffer.from(flag).toString("base64"),
      };
    case "PHISHING":
      return {
        kind: type,
        prompt: "Select the phishing message",
        options: [
          {
            value: "library",
            label: "library@university.edu",
            detail:
              "Your borrowed book is due Friday. Visit the library portal from your bookmark.",
          },
          {
            value: "phish",
            label: "security@cyberus-support.co",
            detail:
              "URGENT: Your account expires in 10 minutes. Reply with your password now!",
          },
          {
            value: "club",
            label: "events@cyberus.edu",
            detail: "Orientation begins at 10:00. No action is required.",
          },
        ],
      };
    case "NETWORK":
      return {
        kind: type,
        prompt: "Simulated scan: select the exposed host",
        options: [
          { value: "router", label: "192.168.1.1", detail: "53 DNS · Gateway" },
          {
            value: "printer",
            label: "192.168.1.5",
            detail: "631 IPP · Lab printer",
          },
          {
            value: "kiosk",
            label: "192.168.1.20",
            detail: "3389 RDP · Student kiosk",
          },
        ],
      };
    case "PORTS":
      return {
        kind: type,
        prompt: "Public web server service list",
        options: [
          { value: "22", label: "22 / SSH" },
          { value: "80", label: "80 / HTTP" },
          { value: "443", label: "443 / HTTPS" },
          { value: "3306", label: "3306 / MySQL" },
        ],
      };
    case "CLIENT_TRUST":
      return {
        kind: type,
        prompt: "Simulated cookie editor",
        initial: "role=user",
      };
    case "SOURCE":
      return {
        kind: type,
        prompt: "A plain landing page. Inspect its simulated source.",
      };
    case "SQLI":
      return { kind: type, prompt: "Training login", initial: "student" };
  }
}

export function interact(
  type: ChallengeType,
  action: string,
  value: string,
  flag: string,
) {
  const deny = {
    success: false,
    message: "Nothing useful appeared. Review the clues and try again.",
  };
  switch (type) {
    case "IDOR":
      return action === "profile" && profileId(value) === "103"
        ? {
            success: true,
            message: "Unauthorized profile 103 opened.",
            flag,
            evidence: "Nadia Fox · Private note",
          }
        : {
            ...deny,
            evidence:
              profileId(value) === "101"
                ? "Maya Chen · Public profile"
                : profileId(value) === "102"
                  ? "Omar Saad · Public profile"
                  : "Profile not found",
          };
    case "ACCESS_CONTROL":
      return action === "route" &&
        routePath(value).replace(/\s/g, "").toLowerCase() === "/challenge-admin"
        ? {
            success: true,
            message: "Challenge-only admin panel opened without authorization.",
            flag,
          }
        : deny;
    case "PHISHING":
      return action === "select" &&
        [
          "phish",
          "security@cyberus-support.co",
          "accounts@cyberus-alerts.co",
        ].includes(value.trim().toLowerCase())
        ? {
            success: true,
            message:
              "Phishing confirmed: lookalike domain, urgency, and credential request.",
            flag,
          }
        : deny;
    case "NETWORK":
      return action === "select" &&
        ["kiosk", "192.168.1.20", "10.0.0.42"].includes(
          value.trim().toLowerCase(),
        )
        ? {
            success: true,
            message: "Exposed RDP found on the student kiosk.",
            flag,
          }
        : deny;
    case "PORTS":
      return action === "select" && value === "3306"
        ? { success: true, message: "Public MySQL exposure identified.", flag }
        : deny;
    case "CLIENT_TRUST":
      return action === "cookie" && value.trim().toLowerCase() === "role=admin"
        ? {
            success: true,
            message: "The sandbox trusted your edited role.",
            flag,
          }
        : deny;
    case "SOURCE":
      return action === "inspect"
        ? {
            success: true,
            message: "A hard-coded API key was discovered in the page source.",
            flag,
            evidence: `API_Key=${flag}`,
          }
        : deny;
    case "SQLI": {
      let username = value;
      try {
        const credentials = JSON.parse(value) as {
          username?: string;
          password?: string;
        };
        username = credentials.username || "";
      } catch {
        // Backwards-compatible plain username input for API and offline clients.
      }
      const normalized = username.replace(/\s+/g, " ").trim().toLowerCase();
      return action === "login" &&
        (normalized.includes("' or '1'='1") || normalized.includes("' or 1=1"))
        ? {
            success: true,
            message:
              "Simulated query bypassed. No database query was executed.",
            flag,
          }
        : deny;
    }
    default:
      return deny;
  }
}

export function decodeCaesar(value: string) {
  return caesar(value.toUpperCase(), -3);
}
