const express = require("express");
const router = express.Router();
const scanController = require("../controllers/scanController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/", requireAuth, scanController.getAllScans);
router.get("/:scanId", requireAuth, scanController.getScanById);
router.post("/", requireAuth, scanController.createScan);

module.exports = router;
