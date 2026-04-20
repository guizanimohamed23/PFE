const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const attackController = require("../controllers/attackController");
const { requireAuth } = require("../middleware/authMiddleware");

// AI endpoints call Ollama (expensive). Limit to 10 requests per minute per IP.
const attackLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests. Please wait a moment." },
});

router.post("/ai-generate", attackLimiter, requireAuth, attackController.generateAttackScenarioWithAI);
router.post("/ai-risk", attackLimiter, requireAuth, attackController.generateRiskAssessmentWithAI);

module.exports = router;
