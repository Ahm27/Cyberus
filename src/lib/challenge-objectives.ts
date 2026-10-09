export const challengeObjectives: Record<
  string,
  { title: string; steps: string[] }
> = {
  IDOR: {
    title: "Open a profile that does not belong to you",
    steps: [
      "Edit the complete CampusLink address.",
      "Find the unauthorized profile.",
      "Copy the flag shown inside that profile.",
    ],
  },
  ACCESS_CONTROL: {
    title: "Reach NovaDesk's hidden admin page",
    steps: [
      "Explore the dashboard, then edit the complete address.",
      "Request the unlinked admin route.",
      "Copy the flag from the unauthorized admin page.",
    ],
  },
  CAESAR: {
    title: "Decode the attacker's secret message",
    steps: [
      "Read the intercepted chat message.",
      "Shift every letter and digit back by 3 yourself.",
      "Submit the decoded CYBERUS flag.",
    ],
  },
  BASE64: {
    title: "Decode the captured Base64 payload",
    steps: [
      "Inspect the captured payload.",
      "Use the payload tool to decode it.",
      "Copy and submit the decoded flag.",
    ],
  },
  PHISHING: {
    title: "Identify the phishing sender",
    steps: [
      "Open and inspect all three emails.",
      "Look for a fake domain, urgency, and a password request.",
      "Enter the phisher's complete email address.",
    ],
  },
  NETWORK: {
    title: "Find the unsafe device on the router",
    steps: [
      "Inspect every connected device and exposed service.",
      "Find the host exposing remote desktop.",
      "Enter that device's IP address.",
    ],
  },
  PORTS: {
    title: "Find the database exposed to the internet",
    steps: [
      "Review the public server's open ports.",
      "Choose the database service that should be restricted.",
      "Enter its port number.",
    ],
  },
  CLIENT_TRUST: {
    title: "Escalate the simulated browser role",
    steps: [
      "Open the simulated developer tools.",
      "Change the client-controlled role to an administrator value.",
      "Reload the vault and copy the exposed flag.",
    ],
  },
  SOURCE: {
    title: "Find the secret left in page source",
    steps: [
      "Explore the normal guest page.",
      "Find and open its small inspect control.",
      "Copy the flag assigned to API_Key in the source.",
    ],
  },
  SQLI: {
    title: "Bypass the simulated login query",
    steps: [
      "Edit the username and password fields.",
      "Make the simulated login condition true.",
      "Copy the flag from the bypassed session.",
    ],
  },
};
