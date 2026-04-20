const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { checkHexStrikeConnection } = require("./services/hexstrikeService");

const routes = require("./routes");

const app = express();

// ── Security headers ────────────────────────────────────────────
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0"); // Disable legacy XSS filter (use CSP instead)
  next();
});

// ── Security middleware ─────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
  credentials: true,
}));

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again in 1 minute." },
});

const scanLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Rate limit reached. Please wait a moment." },
});

app.use("/api/auth", authLimiter);
app.use("/api/scans", scanLimiter);

// ── Body parsing ────────────────────────────────────────────────
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────
app.use("/api", routes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

app.get("/api/health/hexstrike", async (req, res) => {
  const health = await checkHexStrikeConnection();
  res.status(health.ok ? 200 : 503).json(health);
});

// ── 404 fallback ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

module.exports = app;