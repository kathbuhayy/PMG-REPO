const prisma = require("../db/prisma");
const { roleFromDb } = require("./auth");

// Core roles allowed to hold a production assignment.
// Confirm these strings match what roleFromDb() actually returns in your auth.js.
const CLEARED_CORE_ROLES = new Set(["staff", "admin"]);

/**
 * Verifies the target user exists, holds core STAFF/ADMIN clearance,
 * and actively holds the specific StaffRole (job function) being assigned.
 * Returns { ok: true, user } or { ok: false, reason }.
 */
async function verifyStaffClearance(staffId, requiredRole) {
  const targetUser = await prisma.user.findUnique({
    where: { id: Number(staffId) },
    select: { id: true, role: true, first_name: true, last_name: true },
  });

  if (!targetUser) {
    return { ok: false, reason: "not_found" };
  }

  const coreRole = roleFromDb(targetUser.role);
  if (!CLEARED_CORE_ROLES.has(coreRole)) {
    return { ok: false, reason: "no_core_clearance" };
  }

  const activeSubRole = await prisma.userStaffRole.findFirst({
    where: {
      userId: targetUser.id,
      role: requiredRole,
      unassignedAt: null,
    },
  });

  if (!activeSubRole) {
    return { ok: false, reason: "no_sub_role" };
  }

  return { ok: true, user: targetUser };
}

/**
 * Soft-closes any existing active assignment of the same role on an order,
 * then creates the new OrderAssignment. Preserves history via unassignedAt.
 */
async function assignStaffToOrder({ orderId, staffId, role, status, assignedById }) {
  await prisma.orderAssignment.updateMany({
    where: {
      orderId: Number(orderId),
      role,
      unassignedAt: null,
    },
    data: { unassignedAt: new Date() },
  });

  return prisma.orderAssignment.create({
    data: {
      orderId: Number(orderId),
      staffId: Number(staffId),
      role,
      status: status ?? null,
      assignedById: assignedById ?? null,
    },
  });
}

/**
 * Decrements InventorySubstrate/InventoryInk for every order item whose
 * product has consumption rates set. Must run inside an existing $transaction.
 * Silently skips items whose product has no substrate/ink rate configured.
 * Each result entry includes remainingStock/safetyThreshold/belowThreshold
 * so callers can surface low-stock warnings (Sub-Module 7.2).
 */
async function decrementMaterialsForOrder(tx, orderId) {
  const items = await tx.orderItem.findMany({
    where: { orderId: Number(orderId) },
    include: { product: true },
  });

  const results = [];

  for (const item of items) {
    const product = item.product;
    if (!product) continue;

    if (product.substrateMaterialName && product.substrateUsagePerUnit) {
      const amount = product.substrateUsagePerUnit * item.quantity;
      const updated = await tx.inventorySubstrate.updateMany({
        where: { materialName: product.substrateMaterialName },
        data: { stockMeters: { decrement: amount } },
      });

      // Re-fetch to check the resulting level against its safety threshold
      const current = await tx.inventorySubstrate.findUnique({
        where: { materialName: product.substrateMaterialName },
      });

      results.push({
        type: "substrate",
        materialName: product.substrateMaterialName,
        amount,
        matched: updated.count,
        remainingStock: current?.stockMeters ?? null,
        safetyThreshold: current?.safetyThreshold ?? null,
        belowThreshold: current
          ? current.stockMeters <= current.safetyThreshold
          : false,
      });
    }

    if (product.inkColorChannel && product.inkUsagePerUnit) {
      const amount = product.inkUsagePerUnit * item.quantity;
      const updated = await tx.inventoryInk.updateMany({
        where: { colorChannel: product.inkColorChannel },
        data: { volumeMl: { decrement: amount } },
      });

      const current = await tx.inventoryInk.findUnique({
        where: { colorChannel: product.inkColorChannel },
      });

      results.push({
        type: "ink",
        colorChannel: product.inkColorChannel,
        amount,
        matched: updated.count,
        remainingStock: current?.volumeMl ?? null,
        safetyThreshold: current?.safetyThreshold ?? null,
        belowThreshold: current
          ? current.volumeMl <= current.safetyThreshold
          : false,
      });
    }
  }

  return results;
}

/**
 * Builds a formatted restock request document (plain text, supplier-facing)
 * from a single low-stock alert entry produced by decrementMaterialsForOrder.
 */
function formatRequisitionDocument(alert, orderId) {
  const label = alert.type === "substrate" ? alert.materialName : alert.colorChannel;
  const unit = alert.type === "substrate" ? "meters" : "ml";
  // Suggested restock: bring stock back up to 3x the safety threshold.
  // This multiplier is a starting assumption — adjust based on real lead
  // times and consumption rates once you have historical data.
  const requestedAmount = Math.max(
    alert.safetyThreshold * 3 - alert.remainingStock,
    alert.safetyThreshold
  );

  const doc =
    `=== PURCHASE REQUISITION ===\n` +
    `Generated: ${new Date().toISOString()}\n` +
    `Triggered by Order #${orderId}\n` +
    `----------------------------------------\n` +
    `Material Type : ${alert.type === "substrate" ? "Substrate" : "Ink"}\n` +
    `Material Name : ${label}\n` +
    `Current Stock : ${alert.remainingStock} ${unit}\n` +
    `Safety Threshold : ${alert.safetyThreshold} ${unit}\n` +
    `Requested Restock : ${requestedAmount.toFixed(2)} ${unit}\n` +
    `----------------------------------------\n` +
    `Status: PENDING — awaiting procurement action.\n`;

  return { doc, requestedAmount };
}

/**
 * Creates PurchaseRequisition rows for every low-stock alert produced by
 * decrementMaterialsForOrder. Must run inside an existing $transaction.
 */
async function createRequisitionsFromAlerts(tx, alerts, orderId, generatedBy) {
  const created = [];
  for (const alert of alerts) {
    const label = alert.type === "substrate" ? alert.materialName : alert.colorChannel;
    const { doc, requestedAmount } = formatRequisitionDocument(alert, orderId);

    const requisition = await tx.purchaseRequisition.create({
      data: {
        materialType: alert.type,
        materialName: label,
        currentStock: alert.remainingStock,
        safetyThreshold: alert.safetyThreshold,
        requestedAmount,
        status: "PENDING",
        triggeredByOrderId: orderId,
        documentText: doc,
        generatedBy: generatedBy ?? null,
      },
    });

    created.push(requisition);
  }
  return created;
}

module.exports = {
  verifyStaffClearance,
  assignStaffToOrder,
  decrementMaterialsForOrder,
  createRequisitionsFromAlerts,
};