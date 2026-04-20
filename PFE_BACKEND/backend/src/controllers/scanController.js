const scanService = require("../services/scanService");

exports.getAllScans = async (req, res) => {
	try {
		if (req.user?.isGuest) {
			return res.status(403).json({ message: "Guest users cannot view scan history. Please register or log in." });
		}
		const userId = req.user?.id || null;
		const page = Math.max(1, Number(req.query.page) || 1);
		const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
		const result = await scanService.getAll(userId, { page, limit });
		res.json(result);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Internal server error" });
	}
};

exports.getScanById = async (req, res) => {
	try {
		if (req.user?.isGuest) {
			return res.status(403).json({ message: "Guest users cannot view scan history. Please register or log in." });
		}

		const scanId = Number(req.params.scanId);

		if (!Number.isInteger(scanId) || scanId < 1) {
			return res.status(400).json({ message: "Invalid scanId" });
		}

		const userId = req.user?.id || null;
		const scan = await scanService.getById(scanId, userId);

		if (!scan) {
			return res.status(404).json({ message: "Scan not found" });
		}

		res.json(scan);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Internal server error" });
	}
};

exports.createScan = async (req, res) => {
	try {
		const userId = req.user?.isGuest ? null : req.user?.id || null;

		if (!userId) {
			return res.status(403).json({
				scanState: "failed",
				message: "Guest users cannot create scans. Please register or log in.",
			});
		}

		const createdScan = await scanService.create(req.body, userId);
		res.status(201).json(createdScan);
	} catch (error) {
		console.error(error);
		if (error.status) {
			return res.status(error.status).json({
				scanState: error.scannerState || "failed",
				message: error.message,
				details: error.details,
			});
		}
		res.status(500).json({ scanState: "failed", message: "Internal server error" });
	}
};
