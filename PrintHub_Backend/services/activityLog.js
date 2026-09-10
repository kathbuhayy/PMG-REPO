const prisma = require("../db/prisma");
const { roleFromDb } = require("./auth");

async function logActivity({ actor, action, module, description, metadata }) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: actor?.id ?? null,
        userName: actor?.name ?? null,
        userEmail: actor?.email ?? null,
        userRole: actor?.role ?? null,
        action,
        module,
        description,
        metadata: metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error("[ActivityLog] Failed to record entry:", err.message);
  }
}

function identifyActor(prismaClient) {
  return async (req, res, next) => {
    const raw = req.headers["x-user-id"];
    const id = raw ? parseInt(raw, 10) : null;
    if (!id) return next();

    try {
      const user = await prismaClient.user.findUnique({ where: { id } });
      if (user) {
        req.actor = {
          id: user.id,
          name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
          email: user.email,
          role: roleFromDb(user.role),
          branchId: user.branchId ?? null,
        };
      }
    } catch (err) {
      console.error("[ActivityLog] Failed to identify actor:", err.message);
    }
    next();
  };
}

const { verifyAuthToken } = require("./auth");

function requireAuth(prismaClient) {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const decoded = verifyAuthToken(token);
      const user = await prismaClient.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid session" });
      }

      req.actor = {
        id: user.id,
        name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
        email: user.email,
        role: roleFromDb(user.role),
        branchId: user.branchId ?? null,
      };
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.actor || !allowedRoles.includes(req.actor.role)) {
      return res.status(403).json({
        error: "Access Denied: insufficient permissions for this action.",
      });
    }
    next();
  };
}

module.exports = { 
  logActivity, 
  identifyActor, 
  requireAuth, 
  requireRole 
};