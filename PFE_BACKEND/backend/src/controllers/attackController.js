const attackService = require("../services/attackService");

exports.generateAttackScenarioWithAI = async (req, res) => {
  try {
    const result = await attackService.generateScenarioWithAI(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.generateRiskAssessmentWithAI = async (req, res) => {
  try {
    const result = await attackService.generateRiskAssessmentWithAI(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};