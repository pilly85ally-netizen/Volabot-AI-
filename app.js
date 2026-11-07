// Volabot AI dashboard frontend. All displayed market figures/signals are illustrative preview data.
const $ = (id) => document.getElementById(id);
const toast = (message) => {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
};

// Draw a deterministic sample series so the preview does not imply a live price feed.
function drawChart() {
  const canvas = $("priceChart");
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(rect.width * dpr); canvas.height = Math.floor(rect.height * dpr);
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  const values = [];
  let v = 0.48;
  for (let i = 0; i < 68; i++) {
    v += Math.sin(i * .48) * .027 + Math.cos(i * .17) * .012 + (i > 38 ? .004 : -.001);
    v = Math.max(.12, Math.min(.88, v));
    values.push(v);
  }
  const y = n => h - 12 - n * (h - 28);
  const x = i => 8 + i * (w - 16) / (values.length - 1);
  // EMA-like smoothed preview curve.
  const smooth = []; let avg = values[0];
  values.forEach((p, i) => { avg = i ? avg * .72 + p * .28 : p; smooth.push(avg); });
  ctx.lineWidth = 2; ctx.strokeStyle = "#26d69a"; ctx.beginPath();
  values.forEach((p, i) => i ? ctx.lineTo(x(i), y(p)) : ctx.moveTo(x(i), y(p)));
  ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = "#6b9cff"; ctx.beginPath();
  smooth.forEach((p, i) => i ? ctx.lineTo(x(i), y(p)) : ctx.moveTo(x(i), y(p)));
  ctx.stroke();
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "rgba(38,214,154,.17)"); gradient.addColorStop(1, "rgba(38,214,154,0)");
  ctx.lineTo(x(values.length - 1), h); ctx.lineTo(x(0), h); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
}
window.addEventListener("resize", drawChart);
drawChart();

$("marketSelect").addEventListener("change", e => {
  const label = e.target.value;
  $("chartPrice").textContent = "—";
  toast(label + " selected. Live feed is not connected yet.");
});
document.querySelectorAll(".time-tabs button").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".time-tabs button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  toast("Timeframe set to " + btn.dataset.time + " (preview chart).");
}));

function startDerivLogin() {
  toast("Deriv OAuth needs a secure backend token-exchange endpoint before account login can be completed.");
  // The existing OAuth app ID and callback are retained in the project.
  // Do not exchange authorization codes or store access tokens in browser JavaScript.
  const APP_ID = "34LDVrHY1sipjLFU5vucF";
  const REDIRECT = new URL("callback/", window.location.href).toString();
  if (!window.crypto || !crypto.subtle) {
    toast("Secure HTTPS connection is required for Deriv login.");
    return;
  }
  const random = (length) => {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  };
  const toBase64Url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  (async () => {
    const verifier = random(32);
    const challenge = toBase64Url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const state = random(16);
    sessionStorage.setItem("pkce_verifier", verifier);
    sessionStorage.setItem("pkce_state", state);
    const auth = new URL("https://auth.deriv.com/oauth2/auth");
    auth.search = new URLSearchParams({
      response_type: "code", client_id: APP_ID, redirect_uri: REDIRECT,
      scope: "trade", code_challenge: challenge, code_challenge_method: "S256", state
    }).toString();
    location.assign(auth.toString());
  })().catch(() => toast("Could not start Deriv authorization. Please try again."));
}
["sidebarConnect", "connectTop", "connectMain"].forEach(id => $(id).addEventListener("click", startDerivLogin));

let demoBotRunning = false;
$("botStart").addEventListener("click", () => {
  const stake = Number($("stakeInput").value);
  const maxTrades = Number($("maxTrades").value);
  if (!Number.isFinite(stake) || stake < 0.35 || !Number.isInteger(maxTrades) || maxTrades < 1 || maxTrades > 20) {
    $("botFeedback").textContent = "Enter a valid stake (minimum 0.35) and a session limit from 1 to 20.";
    return;
  }
  if (!$("riskToggle").checked) {
    $("botFeedback").textContent = "Enable the risk guard before starting the demo preview.";
    return;
  }
  demoBotRunning = !demoBotRunning;
  $("botStart").textContent = demoBotRunning ? "Stop demo bot preview" : "Enable demo bot preview";
  $("botStart").classList.toggle("btn-primary", !demoBotRunning);
  $("botStart").classList.toggle("btn-outline", demoBotRunning);
  $("botState").innerHTML = demoBotRunning ? "<i></i> DEMO PREVIEW RUNNING" : "<i></i> STOPPED";
  $("botState").style.color = demoBotRunning ? "#26d69a" : "#ffca72";
  $("botMetric").textContent = demoBotRunning ? "Demo preview" : "Stopped";
  $("botMetricFoot").textContent = demoBotRunning ? "No real orders are sent" : "Automation is disabled";
  $("botFeedback").textContent = demoBotRunning
    ? "Demo preview enabled for " + $("strategySelect").value + ". No real trades will be placed."
    : "Demo preview stopped. No trades were placed.";
});
$("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach(x => x.classList.remove("active"));
  link.classList.add("active");
  $("sidebar").classList.remove("open");
}));
