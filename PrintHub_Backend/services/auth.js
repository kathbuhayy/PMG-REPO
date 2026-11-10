// auth.js

// Database role IDs — preserve these values for compatibility.
const ROLE_IDS = Object.freeze({
  admin: 0,
  staff: 1,
  customer: 2,
  branch_admin: 3,
});

// Convert role name to database integer.
const roleToDb = (role = "customer") => {
  return ROLE_IDS[role] ?? ROLE_IDS.customer;
};

// Convert database integer to role name.
const roleFromDb = (num) => {
  switch (Number(num)) {
    case 0:
      return "admin";
    case 1:
      return "staff";
    case 2:
      return "customer";
    case 3:
      return "branch_admin";
    default:
      return "customer";
  }
};

// Display names only. The underlying role remains "staff".
const roleDisplayName = (role) => {
  switch (role) {
    case "admin":
      return "General Admin";
    case "staff":
      return "Branch Staff";
    case "branch_admin":
      return "Branch Admin";
    case "customer":
      return "Customer";
    default:
      return "Customer";
  }
};

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  console.warn(
    "JWT_SECRET is not set. Authentication tokens cannot be signed or verified."
  );
}

function signAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: roleFromDb(user.role),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  ROLE_IDS,
  roleToDb,
  roleFromDb,
  roleDisplayName,
  signAuthToken,
  verifyAuthToken,
};
