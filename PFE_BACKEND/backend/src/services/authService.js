const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const SALT_ROUNDS = 12;

const buildError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const buildGuestUser = () => ({
  id: 0,
  fullName: "Guest User",
  email: "guest@local",
  createdAt: null,
  updatedAt: null,
  isGuest: true,
});

const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  isGuest: Boolean(user.isGuest),
});

const signToken = (user, options = {}) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw buildError(500, "JWT_SECRET is missing");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  const subject = options.subject ?? String(user.id);

  return jwt.sign(
    {
      email: user.email,
      fullName: user.fullName,
      isGuest: Boolean(user.isGuest),
    },
    secret,
    {
      subject,
      expiresIn,
    }
  );
};

exports.register = async (payload) => {
  const fullName = payload?.fullName?.trim();
  const email = payload?.email?.trim()?.toLowerCase();
  const password = payload?.password;

  if (!fullName) {
    throw buildError(400, "fullName is required");
  }

  if (!email) {
    throw buildError(400, "email is required");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw buildError(400, "email format is invalid");
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    throw buildError(400, "password must be at least 8 characters");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw buildError(409, "Email is already in use");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
    },
  });

  const token = signToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
};

exports.login = async (payload) => {
  const email = payload?.email?.trim()?.toLowerCase();
  const password = payload?.password;

  if (!email) {
    throw buildError(400, "email is required");
  }

  if (!password || typeof password !== "string") {
    throw buildError(400, "password is required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw buildError(401, "Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw buildError(401, "Invalid credentials");
  }

  const token = signToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
};

exports.loginAsGuest = async () => {
  const guestUser = buildGuestUser();
  const token = signToken(guestUser, { subject: "guest" });

  return {
    token,
    user: sanitizeUser(guestUser),
  };
};

exports.getMe = async (sessionUser) => {
  if (sessionUser?.isGuest) {
    return sanitizeUser(buildGuestUser());
  }

  const id = Number(sessionUser?.id);

  if (!Number.isInteger(id) || id < 1) {
    throw buildError(400, "Invalid user id");
  }

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw buildError(404, "User not found");
  }

  return sanitizeUser(user);
};
