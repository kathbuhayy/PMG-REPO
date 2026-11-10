
const express = require("express");

const {
  requireAuth,
  requireRole,
  logActivity,
} = require("../services/activityLog");

function createOrderAssignmentRouter(prisma) {
  const router = express.Router();

  // ==========================================
  // 1. STAFF: GET THEIR OWN ASSIGNED ORDERS
  // ==========================================
  router.get(
    "/me/assignments",
    requireAuth(prisma),
    requireRole("staff"),
    async (req, res) => {
      try {
        const assignments = await prisma.orderAssignment.findMany({
          where: {
            assignedToId: req.actor.id,
            branchId: req.actor.branchId,
            status: {
              in: ["assigned", "in_progress"],
            },
          },
          include: {
            order: {
              include: {
                user: true,
                branch: true,
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            assignedBy: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return res.json({ assignments });
      } catch (error) {
        console.error("Get my assignments error:", error);
        return res.status(500).json({
          message: "Failed to retrieve assignments.",
        });
      }
    }
  );

  // ==========================================
  // 2. ADMINS: VIEW ASSIGNMENTS
  // ==========================================
  router.get(
    "/admin/assignments",
    requireAuth(prisma),
    requireRole("admin", "branch_admin"),
    async (req, res) => {
      try {
        const where = {};

        // Branch Admin can only see their own branch.
        if (req.actor.role === "branch_admin") {
          if (req.actor.branchId == null) {
            return res.status(403).json({
              message: "Your account has no assigned branch.",
            });
          }

          where.branchId = req.actor.branchId;
        }

        // General Admin can optionally filter by branch.
        if (req.actor.role === "admin" && req.query.branchId) {
          const branchId = Number(req.query.branchId);

          if (!Number.isInteger(branchId) || branchId <= 0) {
            return res.status(400).json({
              message: "Invalid branch ID.",
            });
          }

          where.branchId = branchId;
        }

        const assignments = await prisma.orderAssignment.findMany({
          where,
          include: {
            order: {
              include: {
                user: true,
                branch: true,
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            assignedTo: true,
            assignedBy: true,
            branch: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return res.json({ assignments });
      } catch (error) {
        console.error("Get assignments error:", error);
        return res.status(500).json({
          message: "Failed to retrieve assignments.",
        });
      }
    }
  );

  // ==========================================
  // 3. ADMINS: ASSIGN AN ORDER TO STAFF
  // ==========================================
  router.post(
    "/admin/orders/:orderId/assignments",
    requireAuth(prisma),
    requireRole("admin", "branch_admin"),
    async (req, res) => {
      try {
        const orderId = Number(req.params.orderId);
        const assignedToId = Number(req.body.assignedToId);
        const note = req.body.note
          ? String(req.body.note).trim()
          : null;

        if (
          !Number.isInteger(orderId) ||
          orderId <= 0 ||
          !Number.isInteger(assignedToId) ||
          assignedToId <= 0
        ) {
          return res.status(400).json({
            message: "Valid order ID and staff ID are required.",
          });
        }

        // Find the order.
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          return res.status(404).json({
            message: "Order not found.",
          });
        }

        // Branch Admin must assign within their own branch.
        if (req.actor.role === "branch_admin") {
          if (
            req.actor.branchId == null ||
            Number(order.branchId) !== Number(req.actor.branchId)
          ) {
            return res.status(403).json({
              message: "You cannot assign orders outside your branch.",
            });
          }
        }

        if (order.branchId == null) {
          return res.status(400).json({
            message: "This order does not have an assigned branch.",
          });
        }

        // Find the selected staff member.
        const staff = await prisma.user.findUnique({
          where: { id: assignedToId },
        });

        if (!staff || Number(staff.role) !== 1) {
          return res.status(400).json({
            message: "Selected user is not a Branch Staff member.",
          });
        }

        // Staff must belong to the same branch as the order.
        if (Number(staff.branchId) !== Number(order.branchId)) {
          return res.status(403).json({
            message: "Staff member must belong to the order's branch.",
          });
        }
        
        // Prevent duplicate active assignments for the same order.
        const existingAssignment =
          await prisma.orderAssignment.findFirst({
            where: {
              orderId,
              status: {
                in: ["assigned", "in_progress"],
              },
            },
          });

        if (existingAssignment) {
          return res.status(409).json({
            message: "This order already has an active assignment.",
          });
        }

        const assignment = await prisma.orderAssignment.create({
          data: {
            orderId,
            assignedToId,
            assignedById: req.actor.id,
            branchId: order.branchId,
            note,
          },
          include: {
            order: true,
            assignedTo: true,
            assignedBy: true,
            branch: true,
          },
        });

        await logActivity({
          actor: req.actor,
          action: "assigned_order",
          module: "order_assignments",
          description:
            `${req.actor.name} assigned Order #${orderId} to ` +
            `${staff.first_name} ${staff.last_name}`,
          metadata: {
            assignmentId: assignment.id,
            orderId,
            assignedToId,
            branchId: order.branchId,
          },
        });

        return res.status(201).json({
          message: "Order assigned successfully.",
          assignment,
        });
      } catch (error) {
        console.error("Create assignment error:", error);
        return res.status(500).json({
          message: "Failed to assign order.",
        });
      }
    }
  );

  // ==========================================
  // 4. UPDATE ASSIGNMENT STATUS
  // ==========================================
  router.patch(
    "/assignments/:id/status",
    requireAuth(prisma),
    requireRole("staff", "admin", "branch_admin"),
    async (req, res) => {
      try {
        const assignmentId = Number(req.params.id);
        const newStatus = String(req.body.status || "");

        if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
          return res.status(400).json({
            message: "Invalid assignment ID.",
          });
        }

        const allowedStatuses = ["in_progress", "completed"];

        if (!allowedStatuses.includes(newStatus)) {
          return res.status(400).json({
            message: "Invalid assignment status.",
          });
        }

        const assignment = await prisma.orderAssignment.findUnique({
          where: { id: assignmentId },
        });

        if (!assignment) {
          return res.status(404).json({
            message: "Assignment not found.",
          });
        }

        // Staff can only update their own assignments.
        if (req.actor.role === "staff") {
          if (
            Number(assignment.assignedToId) !== Number(req.actor.id) ||
            Number(assignment.branchId) !== Number(req.actor.branchId)
          ) {
            return res.status(403).json({
              message: "You cannot update an assignment that is not yours.",
            });
          }
        }

        // Branch Admin can only update assignments in their branch.
        if (req.actor.role === "branch_admin") {
          if (
            req.actor.branchId == null ||
            Number(assignment.branchId) !== Number(req.actor.branchId)
          ) {
            return res.status(403).json({
              message: "You cannot update assignments outside your branch.",
            });
          }
        }

        if (assignment.status === "completed") {
          return res.status(400).json({
            message: "This assignment is already completed.",
          });
        }

        const updatedAssignment =
          await prisma.orderAssignment.update({
            where: { id: assignmentId },
            data: {
              status: newStatus,
              completedAt:
                newStatus === "completed" ? new Date() : null,
            },
          });

        await logActivity({
          actor: req.actor,
          action: "updated_assignment",
          module: "order_assignments",
          description:
            `${req.actor.name} updated assignment #${assignmentId} ` +
            `to ${newStatus}`,
          metadata: {
            assignmentId,
            orderId: assignment.orderId,
            status: newStatus,
          },
        });

        return res.json({
          message: "Assignment status updated successfully.",
          assignment: updatedAssignment,
        });
      } catch (error) {
        console.error("Update assignment status error:", error);
        return res.status(500).json({
          message: "Failed to update assignment status.",
        });
      }
    }
  );

  return router;
}

module.exports = createOrderAssignmentRouter;