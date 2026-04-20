const jwt = require("jsonwebtoken");

const buildErrorResponse = (res, status, message) => {
  return res.status(status).json({ message });
};

exports.requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return buildErrorResponse(res, 401, "Missing or invalid authorization header");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return buildErrorResponse(res, 500, "JWT secret is not configured");
  }

  try {
    const payload = jwt.verify(token, secret);

    req.user = {
      id: payload.isGuest ? 0 : Number(payload.sub),
      email: payload.email,
      fullName: payload.fullName,
      isGuest: Boolean(payload.isGuest),
    };

    next();
  } catch (error) {
    return buildErrorResponse(res, 401, "Invalid or expired token");
  }
};
