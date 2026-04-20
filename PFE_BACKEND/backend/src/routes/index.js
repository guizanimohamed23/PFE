const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const vulnerabilityRoutes = require("./vulnerabilityRoutes");
const scanRoutes = require("./scanRoutes");

router.use("/auth", authRoutes);
router.use("/vulnerabilities", vulnerabilityRoutes);
router.use("/scans", scanRoutes);
router.use("/attacks", require("./attackRoutes"));

module.exports = router;