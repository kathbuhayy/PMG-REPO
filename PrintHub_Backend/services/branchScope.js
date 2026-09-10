// services/branchScope.js
function isBranchAdmin(actor) {
  return !!actor && actor.role === "branch_admin";
}

function strictBranchWhere(actor, field = "branchId") {
  if (!isBranchAdmin(actor)) return {};
  return { [field]: actor.branchId };
}

function sharedOrOwnBranchWhere(actor, field = "branchId") {
  if (!isBranchAdmin(actor)) return {};
  return { OR: [{ [field]: null }, { [field]: actor.branchId }] };
}

function canActOnBranch(actor, recordBranchId) {
  if (!isBranchAdmin(actor)) return true;
  return recordBranchId != null && recordBranchId === actor.branchId;
}

function denyCrossBranch(res) {
  return res.status(403).json({
    error: "Access Denied: this record belongs to a different branch.",
  });
}

function resolveCreateBranchId(actor, requestedBranchId) {
  if (isBranchAdmin(actor)) return actor.branchId;
  if (requestedBranchId === undefined || requestedBranchId === null) return null;
  const parsed = parseInt(requestedBranchId, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

module.exports = {
  isBranchAdmin,
  strictBranchWhere,
  sharedOrOwnBranchWhere,
  canActOnBranch,
  denyCrossBranch,
  resolveCreateBranchId,
};