const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/guest", authController.loginAsGuest);
router.get("/me", requireAuth, authController.me);

module.exports = router;
