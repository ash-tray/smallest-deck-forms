/**
 * Smoke-test the Worker's create action. Usage:
 *   node scripts/test-create.js
 *   PROXY_URL=https://your-worker.workers.dev node scripts/test-create.js
 */

const PROXY_URL =
  process.env.PROXY_URL || "https://deck-builder.akash-nagaraj-fc6.workers.dev";

const payload = {
  action: "create",
  requesterEmail: "test@smallest.ai",
  customerName: `TEST ${new Date().toISOString()}`,
  delivery: "2026-08-20",
  pitches: ["STT (Pulse only)"],
  slides: ["Team", "About"],
  customSlides: "Automated smoke test — safe to delete."
};

async function main() {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);

  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
