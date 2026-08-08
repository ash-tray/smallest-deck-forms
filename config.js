// ============================================================
// Everything in this file is the stuff you'll actually want to
// tweak. The wizard mechanics live in app.js and shouldn't need
// to change much.
// ============================================================

// Your Cloudflare Worker URL (same one used by the Figma plugin).
const PROXY_URL = "https://deck-builder.akash-nagaraj-fc6.workers.dev";

// Only @smallest.ai addresses can submit (add domains here if needed).
const ALLOWED_EMAIL_DOMAINS = ["smallest.ai"];

function isAllowedEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false;
  const domain = normalized.split("@")[1];
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

// Exact strings, must match the Notion "What are we pitching " options.
const PITCH_OPTIONS = [
  "Overview desk (Talks about all our models and product)",
  "Agents (Includes all 4 models)",
  "TTS + STT + SLM",
  "TTS + STT + SLM +S2S",
  "STT (Pulse only)",
  "TTS (Lightning only)",
  "SLM (Electron only)",
  "S2S (Hydra only)",
  "TTS + SLM",
  "STT + SLM",
  "TTS + STT"
];

// Exact strings, must match the Notion "Slides" options.
// "thumb" is a path under assets/ - drop a real exported PNG there and
// point it here to replace the placeholder in gallery view.
const SLIDE_CATALOG = [
  { name: "Team", thumb: null, alwaysAvailable: true },
  { name: "Customers", thumb: null, alwaysAvailable: true },
  { name: "About", thumb: null, alwaysAvailable: true },
  { name: "Unified AI Stack Diagram", thumb: null, alwaysAvailable: true },
  { name: "Model Stack (All models)", thumb: null, alwaysAvailable: true },
  { name: "Offerings Stack (All models & Agents)", thumb: null, alwaysAvailable: true },
  { name: "Model Benchmark overview", thumb: null, alwaysAvailable: true },
  { name: "Pulse (STT) Features", thumb: null, product: "STT" },
  { name: "Pulse (STT) Benchmarks", thumb: null, product: "STT" },
  { name: "Lightning (TTS) Features", thumb: null, product: "TTS" },
  { name: "Lightning (TTS) Benchmarks", thumb: null, product: "TTS" },
  { name: "Hydra (S2S) Features", thumb: null, product: "S2S" },
  { name: "Hydra (S2S) Benchmarks", thumb: null, product: "S2S" },
  { name: "Electron (SLM) Features", thumb: null, product: "SLM" },
  { name: "Electron (SLM) Benchmarks", thumb: null, product: "SLM" },
  { name: "Kogta Customer Slide", thumb: null, alwaysAvailable: true },
  { name: "RingCentral Customer Slide", thumb: null, alwaysAvailable: true },
  { name: "Paytm Customer Slide", thumb: null, alwaysAvailable: true },
  { name: "MMT Customer Slide", thumb: null, alwaysAvailable: true }
];

// Given the pitch options someone picked, return which slide category
// names should be offered in step 3.
//
// Rule: "always available" slides always show. Product-specific slides
// (tagged with product: "STT"/"TTS"/"SLM"/"S2S" above) show if any
// selected pitch string contains that product's substring, OR if the
// pitch is "Overview desk" / "Agents" (both cover all 4 models).
function getAvailableSlides(selectedPitches) {
  const showAllProducts = selectedPitches.some(
    (p) => p.startsWith("Overview desk") || p.startsWith("Agents")
  );

  return SLIDE_CATALOG.filter((slide) => {
    if (slide.alwaysAvailable) return true;
    if (showAllProducts) return true;
    return selectedPitches.some((p) => p.includes(slide.product));
  });
}
