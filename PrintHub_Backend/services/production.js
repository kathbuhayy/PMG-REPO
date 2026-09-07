const prisma = require("../db/prisma");
const { roleFromDb } = require("./auth");

// Core roles allowed to hold a production assignment.
// Confirm these strings match what roleFromDb() actually returns in your auth.js.
const CLEARED_CORE_ROLES = new Set(["staff", "admin"]);

// Maps each StaffRole to the ProductionStatus stage(s) it's responsible for.
// Used to scope the production queue so staff only see orders relevant to
// their department. Roles not tied to an order-stage (INVENTORY_CONTROLLER,
// PROCUREMENT_OFFICER) are omitted — they work off inventory/requisition
// endpoints instead, not the order queue.
const STAFF_ROLE_TO_PRODUCTION_STATUSES = {
  DESIGN_APPROVER: ["PENDING_FILE_CHECK"],
  PAYMENT_VERIFIER: ["AWAITING_PAYMENT"],
  PRINT_TECHNICIAN: ["PRINTING_QUEUE"],
  QUALITY_ASSURANCE_INSPECTOR: ["QUALITY_ASSURANCE"],
  LOGISTICS_PACKER: ["PACKAGING_READY"],
};

async function getRelevantProductionStatuses(userId) {
  const activeRoles = await prisma.userStaffRole.findMany({
    where: { userId: Number(userId), unassignedAt: null },
    select: { role: true },
  });

  const statuses = new Set();
  for (const { role } of activeRoles) {
    const mapped = STAFF_ROLE_TO_PRODUCTION_STATUSES[role];
    if (mapped) mapped.forEach((s) => statuses.add(s));
  }

  return statuses.size > 0 ? Array.from(statuses) : [];
}

/**
 * Resolves which raw materials an order item actually consumes.
 * If the product has a materialUsageMap and the customer's selected
 * material matches a key in it, use that branch (per-option consumption).
 * Otherwise fall back to the product's flat substrate/ink/unit fields,
 * so products without a materialUsageMap behave exactly as before.
 */
function resolveMaterialUsage(product, item) {
  const selectedMaterial = item.customizations?.material?.label;

  const mapEntries = product.materialUsageMap?.material?.[selectedMaterial];
  if (Array.isArray(mapEntries) && mapEntries.length > 0) {
    return mapEntries;
  }

  const fallback = [];
  if (product.substrateMaterialName && product.substrateUsagePerUnit) {
    fallback.push({
      type: "substrate",
      name: product.substrateMaterialName,
      usagePerUnit: product.substrateUsagePerUnit,
    });
  }
  if (product.inkColorChannel && product.inkUsagePerUnit) {
    fallback.push({
      type: "ink",
      name: product.inkColorChannel,
      usagePerUnit: product.inkUsagePerUnit,
    });
  }
  if (product.unitMaterialName && product.unitUsagePerUnit) {
    fallback.push({
      type: "unit",
      name: product.unitMaterialName,
      usagePerUnit: product.unitUsagePerUnit,
    });
  }
  return fallback;
}

/**
 * Decrements InventorySubstrate/InventoryInk for every order item whose
 * product has consumption rates set. Must run inside an existing $transaction.
 * Silently skips items whose product has no substrate/ink rate configured.
 * Each result entry includes remainingStock/safetyThreshold/belowThreshold
 * so callers can surface low-stock warnings (Sub-Module 7.2).
 */
async function decrementMaterialsForOrder(tx, orderId) {
  const [items, order] = await Promise.all([
    tx.orderItem.findMany({
      where: { orderId: Number(orderId) },
      include: { product: true },
    }),
    tx.order.findUnique({
      where: { id: Number(orderId) },
      select: { printWidthInches: true, printHeightInches: true },
    }),
  ]);

  const results = [];

  // Computes a scale factor relative to the product's reference print size.
  // Falls back to 1 (flat per-unit rate, unchanged behavior) whenever the
  // order has no recorded print dimensions or the product has no reference
  // size configured — this keeps existing seeded rates working exactly as
  // before until a product is explicitly calibrated for area-based scaling.
  const getAreaScale = (product) => {
    if (
      !order?.printWidthInches ||
      !order?.printHeightInches ||
      !product.referenceWidthInches ||
      !product.referenceHeightInches
    ) {
      return 1;
    }
    const orderArea = order.printWidthInches * order.printHeightInches;
    const referenceArea = product.referenceWidthInches * product.referenceHeightInches;
    if (referenceArea <= 0) return 1;
    return orderArea / referenceArea;
  };

  for (const item of items) {
    const product = item.product;
    if (!product) continue;

    const areaScale = getAreaScale(product);

    const usageEntries = resolveMaterialUsage(product, item);

    for (const entry of usageEntries) {
      if (entry.type === "substrate") {
        const amount = entry.usagePerUnit * areaScale * item.quantity;
        const updated = await tx.inventorySubstrate.updateMany({
          where: { materialName: entry.name },
          data: { stockMeters: { decrement: amount } },
        });
        const current = await tx.inventorySubstrate.findUnique({
          where: { materialName: entry.name },
        });
        results.push({
          type: "substrate",
          materialName: entry.name,
          amount,
          matched: updated.count,
          remainingStock: current?.stockMeters ?? null,
          safetyThreshold: current?.safetyThreshold ?? null,
          belowThreshold: current
            ? current.stockMeters <= current.safetyThreshold
            : false,
        });
      } else if (entry.type === "ink") {
        const amount = entry.usagePerUnit * areaScale * item.quantity;
        const updated = await tx.inventoryInk.updateMany({
          where: { colorChannel: entry.name },
          data: { volumeMl: { decrement: amount } },
        });
        const current = await tx.inventoryInk.findUnique({
          where: { colorChannel: entry.name },
        });
        results.push({
          type: "ink",
          colorChannel: entry.name,
          amount,
          matched: updated.count,
          remainingStock: current?.volumeMl ?? null,
          safetyThreshold: current?.safetyThreshold ?? null,
          belowThreshold: current
            ? current.volumeMl <= current.safetyThreshold
            : false,
        });
      } else if (entry.type === "unit") {
        const amount = entry.usagePerUnit * item.quantity;
        const updated = await tx.inventoryUnit.updateMany({
          where: { itemName: entry.name },
          data: { stockUnits: { decrement: amount } },
        });
        const current = await tx.inventoryUnit.findUnique({
          where: { itemName: entry.name },
        });
        results.push({
          type: "unit",
          materialName: entry.name,
          amount,
          matched: updated.count,
          remainingStock: current?.stockUnits ?? null,
          safetyThreshold: current?.safetyThreshold ?? null,
          belowThreshold: current
            ? current.stockUnits <= current.safetyThreshold
            : false,
        });
      }
    }
  }

  return results;
}

/**
 * Builds a formatted restock request document (plain text, supplier-facing)
 * from a single low-stock alert entry produced by decrementMaterialsForOrder.
 */
function formatRequisitionDocument(alert, orderId) {
  const label = alert.materialName || alert.colorChannel;
  const unit = alert.type === "substrate" ? "meters" : alert.type === "ink" ? "ml" : "units";
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
    const label = alert.materialName || alert.colorChannel;
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
  decrementMaterialsForOrder,
  createRequisitionsFromAlerts,
  getRelevantProductionStatuses,
};