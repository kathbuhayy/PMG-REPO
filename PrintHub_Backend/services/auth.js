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

module.exports = {
  roleToDb,
  roleFromDb,
};
