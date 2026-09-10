//auth.js
// Converts string role name to its corresponding database integer code.
const roleToDb = (role = "customer") => {
  if (role === "admin") return 0;
  if (role === "staff") return 1;
  if (role === "branch_admin") return 3;
  return 2;
};

// Converts database integer code back to its string role name.
// 3 = branch_admin: same admin-level access as role 0, but every module's
// queries are scoped to the user's assigned branch (see services/branchScope.js).
const roleFromDb = (num) => {
  if (num === 0) return "admin";
  if (num === 1) return "staff";
  if (num === 3) return "branch_admin";
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

function signAuthToken(user) {
  return jwt.sign(
    { id: user.id, role: roleFromDb(user.role) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  roleToDb,
  roleFromDb,
  signAuthToken,
  verifyAuthToken,
};