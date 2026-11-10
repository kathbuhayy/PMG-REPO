// services/branchScope.js

function isGeneralAdmin(actor) {
  return !!actor && actor.role === "admin";
}

function isBranchAdmin(actor) {
  return !!actor && actor.role === "branch_admin";
}

function isBranchStaff(actor) {
  return !!actor && actor.role === "staff";
}

function isAdmin(actor) {
  return isGeneralAdmin(actor) || isBranchAdmin(actor);
}

function strictBranchWhere(actor, field = "branchId") {
  if (isGeneralAdmin(actor)) return {};

  if (isBranchAdmin(actor) || isBranchStaff(actor)) {
    if (actor.branchId == null) {
      return { [field]: null };
    }

    return { [field]: actor.branchId };
  }

  return {};
}
function sharedOrOwnBranchWhere(actor, field = "branchId") {
  if (isGeneralAdmin(actor)) return {};

  if (isBranchStaff(actor)) {
    return strictBranchWhere(actor, field);
  }

  if (isBranchAdmin(actor)) {
    if (actor.branchId == null) {
      return {
        AND: [
          { [field]: null },
          { [field]: { not: null } },
        ],
      };
    }

    return {
      OR: [
        { [field]: null },
        { [field]: actor.branchId },
      ],
    };
  }

  return {};
}

function canActOnBranch(actor, recordBranchId) {
  if (isGeneralAdmin(actor)) return true;

  if (isBranchAdmin(actor) || isBranchStaff(actor)) {
    return (
      actor.branchId != null &&
      recordBranchId != null &&
      Number(actor.branchId) === Number(recordBranchId)
    );
  }

  return false;
}

function canAccessAssignment(actor, assignment) {
  if (!actor || !assignment) return false;

  if (isGeneralAdmin(actor)) return true;

  if (isBranchAdmin(actor)) {
    return (
      actor.branchId != null &&
      assignment.branchId != null &&
      Number(actor.branchId) === Number(assignment.branchId)
    );
  }

  if (isBranchStaff(actor)) {
    return (
      actor.id != null &&
      Number(actor.id) === Number(assignment.assignedToId) &&
      actor.branchId != null &&
      assignment.branchId != null &&
      Number(actor.branchId) === Number(assignment.branchId)
    );
  }

  return false;
}

function denyCrossBranch(res) {
  return res.status(403).json({
    error: "Access Denied: this record belongs to a different branch.",
  });
}

function resolveCreateBranchId(actor, requestedBranchId) {
  if (isBranchAdmin(actor)) return actor.branchId;

  if (
    requestedBranchId === undefined ||
    requestedBranchId === null
  ) {
    return null;
  }

  const parsed = parseInt(requestedBranchId, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

module.exports = {
  isGeneralAdmin,
  isBranchAdmin,
  isBranchStaff,
  isAdmin,
  strictBranchWhere,
  sharedOrOwnBranchWhere,
  canActOnBranch,
  canAccessAssignment,
  denyCrossBranch,
  resolveCreateBranchId,
};
