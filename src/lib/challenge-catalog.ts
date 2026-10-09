export type CatalogChallenge = {
  number: number;
  slug: string;
  title: string;
  category: string;
  difficulty: "EASY" | "EASY_MEDIUM" | "MEDIUM";
  type:
    | "IDOR"
    | "ACCESS_CONTROL"
    | "CAESAR"
    | "BASE64"
    | "PHISHING"
    | "NETWORK"
    | "PORTS"
    | "CLIENT_TRUST"
    | "SOURCE"
    | "SQLI";
  shortDescription: string;
  instructions: string;
  hints: string[];
  educationalExplanation: string;
};

export const challengeCatalog: CatalogChallenge[] = [
  {
    number: 1,
    slug: "not-your-profile",
    title: "NOT YOUR PROFILE",
    category: "Broken Access Control / IDOR",
    difficulty: "EASY",
    type: "IDOR",
    shortDescription: "Can an innocent profile number reveal too much?",
    instructions:
      "Goal: edit the complete CampusLink URL, open a profile you do not own, and copy the flag exposed inside that profile.",
    hints: [
      "Look closely at the profile number.",
      "Try changing 101 to nearby values.",
      "Profile 103 contains the evidence.",
    ],
    educationalExplanation:
      "You exploited an IDOR flaw: the simulated endpoint accepted an object ID without checking ownership. Real systems must authorize access to every object.",
  },
  {
    number: 2,
    slug: "admin-says-who",
    title: "ADMIN? SAYS WHO?",
    category: "Broken Access Control",
    difficulty: "EASY",
    type: "ACCESS_CONTROL",
    shortDescription: "A hidden button is not an authorization check.",
    instructions:
      "Goal: edit the complete NovaDesk URL, reach the hidden challenge admin route, and copy the flag shown inside the unauthorized page.",
    hints: [
      "Hidden routes can still be requested.",
      "The route is named /challenge-admin.",
      "Enter /challenge-admin in the route box.",
    ],
    educationalExplanation:
      "The simulated app relied on a hidden interface instead of server authorization. Real admin routes must verify an authenticated, authorized user on every request.",
  },
  {
    number: 3,
    slug: "secret-message",
    title: "SECRET MESSAGE",
    category: "Cryptography",
    difficulty: "EASY_MEDIUM",
    type: "CAESAR",
    shortDescription: "Shift the alphabet back to reveal a message.",
    instructions:
      "Goal: read the intercepted attacker message and decode its Caesar-shifted text yourself. Enter the decoded flag below.",
    hints: [
      "D becomes A when shifted back by 3.",
      "Apply the shift to letters and digits inside the braces.",
      "Use the built-in Caesar helper.",
    ],
    educationalExplanation:
      "A Caesar cipher substitutes characters with a fixed shift. It is useful for learning, but far too predictable to protect real secrets.",
  },
  {
    number: 4,
    slug: "64-reasons",
    title: "64 REASONS",
    category: "Encoding",
    difficulty: "EASY",
    type: "BASE64",
    shortDescription: "This message is encoded, not encrypted.",
    instructions:
      "Decode the Base64 text in the terminal. A built-in decoder is available, so no external website is needed.",
    hints: [
      "Base64 often ends with =.",
      "Encoding is reversible without a secret key.",
      "Paste the text into the decoder and tap Decode.",
    ],
    educationalExplanation:
      "Base64 changes data into a transport-friendly text form. It provides no confidentiality and should never be treated as encryption.",
  },
  {
    number: 5,
    slug: "youve-been-phished",
    title: "YOU'VE BEEN PHISHED",
    category: "Social Engineering",
    difficulty: "EASY",
    type: "PHISHING",
    shortDescription: "Spot the message designed to steal credentials.",
    instructions:
      "Goal: inspect the three messages in the mail simulator and enter the phisher's complete email address.",
    hints: [
      "Urgency is a common pressure tactic.",
      "Check spelling in the sender domain.",
      "Choose the message from cyberus-support.co asking for a password.",
    ],
    educationalExplanation:
      "You identified phishing through an impersonated domain, urgency, and a credential request. Verify senders through a trusted channel before acting.",
  },
  {
    number: 6,
    slug: "whos-on-the-wifi",
    title: "WHO'S ON THE WI-FI?",
    category: "Network",
    difficulty: "EASY_MEDIUM",
    type: "NETWORK",
    shortDescription: "Review a safe, simulated network scan.",
    instructions:
      "Goal: inspect the router's connected-device list and enter the IP address exposing an unsafe remote-control service.",
    hints: [
      "Routers and printers are expected here.",
      "Remote desktop should not be open on a student kiosk.",
      "Select 192.168.1.20 with port 3389.",
    ],
    educationalExplanation:
      "You reviewed exposed services to find an unusual risk. Defenders inventory hosts and restrict services to the networks and users that need them.",
  },
  {
    number: 7,
    slug: "knock-knock",
    title: "KNOCK KNOCK",
    category: "Ports / Services",
    difficulty: "EASY",
    type: "PORTS",
    shortDescription: "Which service belongs behind the firewall?",
    instructions:
      "The public server exposes several ports. Select the database service that should not be internet-facing.",
    hints: [
      "Web ports are expected on a public web server.",
      "Databases normally accept connections only from trusted application servers.",
      "Select 3306 / MySQL.",
    ],
    educationalExplanation:
      "MySQL on port 3306 should usually be restricted to trusted systems. Reducing exposed services shrinks the attack surface.",
  },
  {
    number: 8,
    slug: "cookie-monster",
    title: "COOKIE MONSTER",
    category: "Client-Side Trust",
    difficulty: "EASY_MEDIUM",
    type: "CLIENT_TRUST",
    shortDescription: "The browser controls more than this app realizes.",
    instructions:
      "Edit the simulated challenge cookie from role=user to an elevated value, then request the vault.",
    hints: [
      "Client-controlled values can be changed.",
      "Admins often use the role name admin.",
      "Set the simulated value to role=admin.",
    ],
    educationalExplanation:
      "The sandbox trusted client-controlled authorization state. Real applications must keep roles server-side and authorize every protected action.",
  },
  {
    number: 9,
    slug: "source-never-lies",
    title: "SOURCE NEVER LIES",
    category: "Recon / Source",
    difficulty: "EASY",
    type: "SOURCE",
    shortDescription: "Developers sometimes leave secrets in comments.",
    instructions:
      "Use the phone-friendly Inspect Source button and investigate the simulated page source.",
    hints: [
      "Comments are written between <!-- and -->.",
      "Tap Inspect Source.",
      "The developer comment contains the evidence.",
    ],
    educationalExplanation:
      "Client-side source is public. Comments and bundles must never contain credentials or real secrets; use server-side controls instead.",
  },
  {
    number: 10,
    slug: "trust-no-input",
    title: "TRUST NO INPUT",
    category: "SQL Injection Simulation",
    difficulty: "MEDIUM",
    type: "SQLI",
    shortDescription: "A login query trusts input far too much.",
    instructions:
      "Bypass the simulated login using the classic idea: make the condition always true. This never touches the real database.",
    hints: [
      "The app conceptually concatenates your input into a query.",
      "SQL comments can ignore what follows.",
      "Try ' OR '1'='1' -- as the username.",
    ],
    educationalExplanation:
      "You simulated SQL injection by changing the meaning of a query. The real platform uses Prisma and parameterized operations; never concatenate untrusted input into SQL.",
  },
];
