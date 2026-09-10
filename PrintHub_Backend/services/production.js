const prisma = require("../db/prisma");
const { roleFromDb } = require("./auth");
const { getZoneRealSize } = require("./zonePhysicalInches");
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
 * Converts a saved design (either the new {zoneLayers} shape or the
 * legacy {zones, zoneTexts} shape used by FlatCustomizerPanel and
 * older saved orders) into a common { [zoneId]: [{w,h}, ...] } map —
 * just the fields needed for area math.
 */
function normalizeDesignToZoneLayers(design) {
  if (!design) return {};
  if (design.zoneLayers) return design.zoneLayers;

  const zoneLayers = {};
  const zoneIds = new Set([
    ...Object.keys(design.zones || {}),
    ...Object.keys(design.zoneTexts || {}),
  ]);
  zoneIds.forEach((zoneId) => {
    const layers = [];
    const img = design.zones?.[zoneId];
    if (img?.imageUrl) {
      layers.push({ w: img.w ?? 80, h: img.h ?? 80 });
    }
    (design.zoneTexts?.[zoneId] || []).forEach((t) => {
      layers.push({ w: t.w ?? 70, h: t.h ?? 20 });
    });
    zoneLayers[zoneId] = layers;
  });
  return zoneLayers;
}

// A design covering less of the print area than this fraction is
// still billed as if it covered this much — reflects real per-run
// setup/prep overhead that doesn't shrink away for a tiny logo.
const MIN_DESIGN_AREA_SCALE = 0.1;

/**
 * Fraction (0-1) of the product's full printable area that this order
 * item's actual saved design covers, used to scale substrate/ink
 * usage. Returns 1 (no scaling) when there's no saved design or the
 * product has no defined print zones, so un-customized or legacy
 * items keep behaving exactly as before.
 */
function computeDesignAreaScale(item, product) {
  const design = item.customizations?.design;
  const printZones = product.print_zones || [];
  if (!design || printZones.length === 0) return 1;

  const sizeStr = item.customizations?.size;
  const zoneLayers = normalizeDesignToZoneLayers(design);

  let actualArea = 0;
  let fullArea = 0;

  for (const zoneId of printZones) {
    const { width, height } = getZoneRealSize(zoneId, sizeStr);
    const zoneArea = width * height;
    fullArea += zoneArea;

    const layers = zoneLayers[zoneId] || [];
    if (layers.length === 0) continue;

    const zoneCovered = layers.reduce((sum, layer) => {
      const w = Number(layer.w) || 0;
      const h = Number(layer.h) || 0;
      return sum + (w / 100) * (h / 100) * zoneArea;
    }, 0);
    // Cap at the zone's own area so overlapping layers can't push a
    // single zone's contribution above 100% coverage.
    actualArea += Math.min(zoneCovered, zoneArea);
  }

  if (fullArea <= 0) return 1;
  const scale = actualArea / fullArea;
  return Math.max(MIN_DESIGN_AREA_SCALE, Math.min(scale, 1));
}

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
      select: { printWidthInches: true, printHeightInches: true, branchId: true },
    }),
  ]);

  const results = [];
  const branchId = order?.branchId ?? null;

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
    const designScale = computeDesignAreaScale(item, product);
    const itemBreakdown = [];

    const usageEntries = resolveMaterialUsage(product, item);

    for (const entry of usageEntries) {
      if (entry.type === "substrate") {
        const amount = entry.usagePerUnit * areaScale * designScale * item.quantity;
        const updated = await tx.inventorySubstrate.updateMany({
          where: { materialName: entry.name, branchId },
          data: { stockMeters: { decrement: amount } },
        });
        const current = await tx.inventorySubstrate.findFirst({
          where: { materialName: entry.name, branchId },
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
        itemBreakdown.push({
          type: "substrate",
          name: entry.name,
          unit: "meters",
          amount: Number(amount.toFixed(4)),
          unitCost: current?.costPerMeter ?? null,
          lineCost:
            current?.costPerMeter != null
              ? Number((amount * current.costPerMeter).toFixed(2))
              : null,
        });
      } else if (entry.type === "ink") {
        const amount = entry.usagePerUnit * areaScale * designScale * item.quantity;
        const updated = await tx.inventoryInk.updateMany({
          where: { colorChannel: entry.name, branchId },
          data: { volumeMl: { decrement: amount } },
        });
        const current = await tx.inventoryInk.findFirst({
          where: { colorChannel: entry.name, branchId },
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
        itemBreakdown.push({
          type: "ink",
          name: entry.name,
          unit: "ml",
          amount: Number(amount.toFixed(4)),
          unitCost: current?.costPerMl ?? null,
          lineCost:
            current?.costPerMl != null
              ? Number((amount * current.costPerMl).toFixed(2))
              : null,
        });
      } else if (entry.type === "unit") {
        // RAW BLANK GARMENT STOCK IS ALREADY DEDUCTED
        // WHEN THE CUSTOMER CREATES THE ORDER.
        //
        // Do NOT deduct InventoryUnit again when the order
        // moves to PRINTING_QUEUE.
        //
        // Substrate and ink are still deducted above.

        itemBreakdown.push({
          type: "unit",
          name: entry.name,
          unit: "pcs",
          amount: 0,
          unitCost: null,
          lineCost: 0,
          deductedAt: "ORDER_CREATION",
        });
      }
    }

    if (itemBreakdown.length > 0) {
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          customizations: {
            ...(item.customizations || {}),
            materialCost: itemBreakdown,
          },
        },
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
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { branchId: true } });
  const branchId = order?.branchId ?? null;

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
        branchId,
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
  resolveMaterialUsage,
  computeDesignAreaScale,
};