require("dotenv").config();
const app = require("./app");
const prisma = require("./config/db");
const { checkHexStrikeConnection } = require("./services/hexstrikeService");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  checkHexStrikeConnection()
    .then((health) => {
      if (health.ok) {
        console.log(
          `[hexstrike] reachable at ${health.baseUrl} (status=${health.status}, ${health.elapsedMs}ms)`
        );
      } else {
        console.warn(
          `[hexstrike] unreachable at ${health.baseUrl} (${health.code || "NO_CODE"}: ${health.message})`
        );
      }
    })
    .catch((error) => {
      console.warn(`[hexstrike] health check failed: ${error.message}`);
    });
});

// ── Graceful shutdown ───────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`[server] ${signal} received — shutting down gracefully`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("[server] Database connection closed");
    } catch (err) {
      console.error("[server] Error disconnecting from database:", err.message);
    }
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    console.error("[server] Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));