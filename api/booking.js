/**
 * POST /api/booking — receives a booking request from the pop-up on the home page.
 *
 * Security model
 * - Same-origin only: the Origin (or Sec-Fetch-Site) header must match this site, which,
 *   together with the JSON-only content type, blocks cross-site form posts (CSRF).
 * - Strict server-side validation and normalisation of every field (the browser checks are
 *   only a convenience). Anything that does not match the expected shape is rejected.
 * - Honeypot field and a per-IP rate limit against bots (in-memory, best effort per instance;
 *   for hard limits add a Vercel Firewall rule for /api/booking).
 * - No personal data is written to logs. Outgoing e-mail HTML is escaped.
 * - Secrets live only in Vercel environment variables (see .env.example), never in the client.
 *
 * Delivery (configure at least one in Vercel → Settings → Environment Variables):
 * - BOOKING_WEBHOOK_URL (+ optional BOOKING_WEBHOOK_SECRET for an HMAC-SHA256 signature)
 * - RESEND_API_KEY + BOOKING_EMAIL_FROM + BOOKING_EMAIL_TO (team notification e-mail)
 * With neither configured the endpoint runs in demo mode: it validates and answers OK but
 * stores and sends nothing (set BOOKING_MODE=live to refuse bookings instead).
 */
"use strict";

const crypto = require("node:crypto");

const MAX_BODY_BYTES = 4096;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map(); // ip -> [timestamps]

const CARS = new Set([
  "Tesla Model S Long Range", "Tesla Model S Plaid", "Tesla Model 3 Long Range AWD",
  "Tesla Model Y Long Range AWD", "Tesla Model 3 Performance", "Tesla Model Y Performance",
]);
const RE = {
  name: /^[\p{L}\p{M}][\p{L}\p{M}' .\-]{1,79}$/u,
  email: /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/,
  phone: /^\+?[0-9][0-9 ()\-]{5,22}$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  city: /^[\p{L} .\-]{0,40}$/u,
};

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

// Removes control characters, normalises Unicode and collapses whitespace.
function clean(v, max) {
  if (typeof v !== "string") return "";
  return v.normalize("NFC").replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function clientIp(req) {
  const xf = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xf || String(req.headers["x-real-ip"] || "") || (req.socket && req.socket.remoteAddress) || "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
  return list.length > RATE_MAX;
}

function originAllowed(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  const extra = String(process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const origin = req.headers.origin;
  if (origin) {
    try {
      const u = new URL(origin);
      if (u.host.toLowerCase() === host) return true;
      return extra.includes(u.origin.toLowerCase());
    } catch (e) { return false; }
  }
  // Some same-origin requests omit Origin; modern browsers always send Sec-Fetch-Site.
  return req.headers["sec-fetch-site"] === "same-origin";
}

function isoToday(offsetDays) {
  const d = new Date(Date.now() + (offsetDays || 0) * 864e5);
  return d.toISOString().slice(0, 10);
}

function validate(b) {
  const d = {
    car: clean(b.car, 60),
    date: clean(b.date, 10),
    days: Number(b.days),
    delivery: b.delivery === true,
    childSeat: b.childSeat === true,
    extraDriver: b.extraDriver === true,
    city: clean(b.city, 40),
    name: clean(b.name, 80),
    email: clean(b.email, 254).toLowerCase(),
    phone: clean(b.phone, 24),
  };
  if (!CARS.has(d.car)) return { error: "Please choose a car from our fleet." };
  // Allow one day of slack for visitors in time zones ahead of UTC.
  if (!RE.date.test(d.date) || d.date < isoToday(-1) || d.date > isoToday(366)) return { error: "Please choose a valid pick-up date." };
  if (!Number.isInteger(d.days) || d.days < 1 || d.days > 30) return { error: "Rental length must be between 1 and 30 days." };
  if (!RE.city.test(d.city)) return { error: "Please choose a city from the list." };
  if (!RE.name.test(d.name)) return { error: "Please enter your full name." };
  if (!RE.email.test(d.email)) return { error: "Please enter a valid email address." };
  if (!RE.phone.test(d.phone) || d.phone.replace(/\D/g, "").length < 7) return { error: "Please enter a valid phone number." };
  return { data: d };
}

async function postJson(url, body, headers) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, headers), body, signal: ctrl.signal });
    if (!r.ok) throw new Error("upstream " + r.status);
  } finally { clearTimeout(timer); }
}

async function deliver(d, ref) {
  const tasks = [];
  const payload = JSON.stringify({ type: "booking.created", ref, createdAt: new Date().toISOString(), booking: d });
  if (process.env.BOOKING_WEBHOOK_URL) {
    const headers = {};
    if (process.env.BOOKING_WEBHOOK_SECRET) {
      headers["X-Velto-Signature"] = "sha256=" + crypto.createHmac("sha256", process.env.BOOKING_WEBHOOK_SECRET).update(payload).digest("hex");
    }
    tasks.push(postJson(process.env.BOOKING_WEBHOOK_URL, payload, headers));
  }
  if (process.env.RESEND_API_KEY && process.env.BOOKING_EMAIL_FROM && process.env.BOOKING_EMAIL_TO) {
    const rows = [["Reference", ref], ["Car", d.car], ["City", d.city || "—"], ["Pick-up", d.date], ["Days", d.days],
      ["Delivery", d.delivery ? "yes" : "no"], ["Child seat", d.childSeat ? "yes" : "no"], ["Extra driver", d.extraDriver ? "yes" : "no"],
      ["Name", d.name], ["Email", d.email], ["Phone", d.phone]];
    const html = "<h2>New booking request</h2><table>" + rows.map(([k, v]) => "<tr><td><b>" + escapeHtml(k) + "</b></td><td>" + escapeHtml(v) + "</td></tr>").join("") + "</table>";
    const text = rows.map(([k, v]) => k + ": " + v).join("\n");
    tasks.push(postJson("https://api.resend.com/emails", JSON.stringify({
      from: process.env.BOOKING_EMAIL_FROM, to: process.env.BOOKING_EMAIL_TO.split(",").map((s) => s.trim()),
      reply_to: d.email, subject: "Booking request " + ref + " · " + d.car, html, text,
    }), { Authorization: "Bearer " + process.env.RESEND_API_KEY }));
  }
  if (!tasks.length) return "none";
  await Promise.all(tasks);
  return "sent";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }
  if (!originAllowed(req)) return send(res, 403, { error: "Forbidden." });
  if (!/^application\/json\b/i.test(String(req.headers["content-type"] || ""))) return send(res, 415, { error: "Unsupported request." });
  if (Number(req.headers["content-length"] || 0) > MAX_BODY_BYTES) return send(res, 413, { error: "Request too large." });
  if (rateLimited(clientIp(req))) {
    res.setHeader("Retry-After", "600");
    return send(res, 429, { error: "Too many requests. Please try again in a few minutes." });
  }

  let body = req.body;
  try {
    if (typeof body === "string") body = JSON.parse(body);
  } catch (e) { return send(res, 400, { error: "Invalid request." }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return send(res, 400, { error: "Invalid request." });

  // Honeypot: real visitors never see or fill this field. Answer as if all went well.
  if (typeof body.website === "string" && body.website.trim() !== "") return send(res, 200, { ok: true });

  const v = validate(body);
  if (v.error) return send(res, 422, { error: v.error });

  const ref = "VL-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  try {
    const result = await deliver(v.data, ref);
    if (result === "none") {
      if (String(process.env.BOOKING_MODE || "demo").toLowerCase() === "live") {
        console.error("booking: no delivery channel configured");
        return send(res, 503, { error: "Online booking is unavailable right now. Please call us." });
      }
      return send(res, 200, { ok: true, ref, demo: true });
    }
    return send(res, 200, { ok: true, ref });
  } catch (e) {
    console.error("booking: delivery failed", e && e.message); // no personal data in logs
    return send(res, 502, { error: "We couldn't send your booking. Please try again or call us." });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: "4kb" } } };
