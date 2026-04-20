const authService = require("../services/authService");

const handleError = (res, error) => {
  console.error(error);
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  return res.status(500).json({ message: "Internal server error" });
};

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

exports.loginAsGuest = async (req, res) => {
  try {
    const result = await authService.loginAsGuest();
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

exports.me = async (req, res) => {
  try {
    const user = await authService.getMe(req.user);
    res.status(200).json(user);
  } catch (error) {
    handleError(res, error);
  }
};
