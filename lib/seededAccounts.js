export const SEEDED_ACCOUNTS = Object.freeze([
  Object.freeze({
    username: "Amit Kumar",
    aliases: ["amit kumar", "amit.kumar"],
    email: "amit.kumar@accounts.aadya.app",
    displayName: "Amit Kumar",
    title: "Farmer",
  }),
  Object.freeze({
    username: "Priya Sharma",
    aliases: ["priya sharma", "priya.sharma"],
    email: "priya.sharma@accounts.aadya.app",
    displayName: "Priya Sharma",
    title: "Job seeker · Student · Professional",
  }),
  // Accounts whose sessions follow a script in lib/sessionScripts.js. The
  // account is the only switch — nothing in the interface marks them out.
  Object.freeze({
    username: "Roshan Kumar",
    aliases: ["roshan kumar", "roshan", "jobs"],
    email: "jobs@aadya.app",
    displayName: "Roshan Kumar",
    title: "Job seeker · Patna, Bihar",
  }),
  Object.freeze({
    username: "Sunita Devi",
    aliases: ["sunita devi", "sunita", "farm"],
    email: "farm@aadya.app",
    displayName: "Sunita Devi",
    title: "किसान · सीतापुर, उत्तर प्रदेश",
  }),
]);

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveLoginIdentifier(value) {
  const normalized = normalize(value);
  const account = SEEDED_ACCOUNTS.find((entry) => entry.aliases.includes(normalized) || normalize(entry.email) === normalized);
  return account?.email || String(value || "").trim();
}

export function seededAccountForEmail(email) {
  const normalized = normalize(email);
  return SEEDED_ACCOUNTS.find((entry) => normalize(entry.email) === normalized) || null;
}
