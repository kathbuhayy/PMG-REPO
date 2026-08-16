// Converts string role name to its corresponding database integer code.
const roleToDb = (role = "customer") => {
  if (role === "admin") return 0;
  if (role === "staff") return 1;
  return 2;
};

// Converts database integer code back to its string role name.
const roleFromDb = (num) => {
  if (num === 0) return "admin";
  if (num === 1) return "staff";
  return "customer";
};

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  console.warn(
    "⚠️ JWT_SECRET is not set. Authentication tokens cannot be signed or verified."
  );
}

/** Signs a JWT for a logged-in user. Payload stays minimal — id and role
 *  only — since anything else should be looked up fresh from the DB. */
function signAuthToken(user) {
  return jwt.sign(
    { id: user.id, role: roleFromDb(user.role) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/** Verifies a JWT. Returns the decoded payload or throws. */
function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  roleToDb,
  roleFromDb,
  signAuthToken,
  verifyAuthToken,
};
